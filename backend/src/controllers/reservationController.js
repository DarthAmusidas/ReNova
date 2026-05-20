// Controlador de reservas
const { Pool } = require("pg");
const { isValidUUID } = require("../utils/validators");

// Conexión a la base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Estados permitidos para una reserva
const allowedStatuses = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED"
];

// Crea una notificación interna
const createNotification = async (
  client,
  userId,
  title,
  message,
  type
) => {
  await client.query(
    `INSERT INTO notifications
      (user_id, title, message, type)
     VALUES ($1, $2, $3, $4)`,
    [userId, title, message, type]
  );
};

// Crea una nueva reserva
const createReservation = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    // Extrae datos del body
    const { product_id, quantity_reserved } = req.body || {};

    // La ONG se obtiene desde el token JWT
    const ong_id = req.user.id;

    // Valida campos obligatorios
    if (
      product_id === undefined ||
      product_id === null ||
      product_id === "" ||
      quantity_reserved === undefined ||
      quantity_reserved === null ||
      quantity_reserved === ""
    ) {
      return res.status(400).json({
        error: "El id del producto y la cantidad a reservar son obligatorios"
      });
    }

    // Valida formato UUID del producto
    if (!isValidUUID(product_id)) {
      return res.status(400).json({
        error: "El id del producto debe tener un formato válido"
      });
    }

    // Convierte cantidad reservada a número
    const quantity = Number(quantity_reserved);

    // Valida que la cantidad sea numérica y mayor a cero
    if (Number.isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({
        error: "La cantidad a reservar debe ser un número mayor a 0"
      });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    // Busca el producto a reservar
    const productResult = await client.query(
      `SELECT *
       FROM products
       WHERE id = $1`,
      [product_id]
    );

    const product = productResult.rows[0];

    // Valida que el producto exista
    if (!product) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        error: "Producto no encontrado"
      });
    }
    // Valida que el producto esté disponible
    if (product.status !== "AVAILABLE") {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        error: "El producto no está disponible para reservar"
      });
    }
    // Valida que el producto no esté vencido
    if (product.expiration_date) {
      const expirationDate = new Date(product.expiration_date);
      const today = new Date();

      today.setHours(0, 0, 0, 0);

      if (expirationDate < today) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          error: "No se puede reservar un producto vencido"
        });
      }
    }

    // Valida stock suficiente
    if (quantity > product.quantity) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        error: "La cantidad solicitada supera el stock disponible"
      });
    }

    // Crea la reserva en estado PENDING
    const reservationResult = await client.query(
      `INSERT INTO reservations
        (product_id, ong_id, quantity_reserved, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [product_id, ong_id, quantity, "PENDING"]
    );

    const reservation = reservationResult.rows[0];

    // Descuenta stock del producto
    const newQuantity = product.quantity - quantity;
    const newStatus = newQuantity === 0 ? "RESERVED" : "AVAILABLE";

    await client.query(
      `UPDATE products
       SET quantity = $1, status = $2
       WHERE id = $3`,
      [newQuantity, newStatus, product_id]
    );

    // Notifica al supermercado dueño del producto
    await createNotification(
      client,
      product.supermarket_id,
      "Nueva reserva recibida",
      `Una ONG reservó ${quantity} ${product.unit} del producto "${product.name}".`,
      "RESERVATION_CREATED"
    );

    await client.query("COMMIT");
    transactionStarted = false;

    // Responde con la reserva creada
    res.status(201).json({
      message: "Reserva creada correctamente",
      reservation
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error(error);

    res.status(500).json({
      error: "Error al crear reserva"
    });
  } finally {
    client.release();
  }
};

// Obtiene reservas según el rol del usuario autenticado
const getReservations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let result;

    // Si es supermercado, ve reservas sobre sus productos
    if (userRole === "SUPERMARKET") {
      result = await pool.query(
        `SELECT
          r.id,
          r.product_id,
          r.ong_id,
          r.quantity_reserved,
          r.status,
          r.reserved_at,
          p.name AS product_name,
          p.description AS product_description,
          p.category AS product_category,
          p.quantity AS product_quantity,
          p.unit,
          p.expiration_date,
          p.supermarket_id,
          u.name AS ong_name,
          u.email AS ong_email
        FROM reservations r
        INNER JOIN products p ON p.id = r.product_id
        INNER JOIN users u ON u.id = r.ong_id
        WHERE p.supermarket_id = $1
        ORDER BY r.reserved_at DESC`,
        [userId]
      );
    }

    // Si es ONG, ve sus propias reservas
    else if (userRole === "ONG") {
      result = await pool.query(
        `SELECT
          r.id,
          r.product_id,
          r.ong_id,
          r.quantity_reserved,
          r.status,
          r.reserved_at,
          p.name AS product_name,
          p.description AS product_description,
          p.category AS product_category,
          p.quantity AS product_quantity,
          p.unit,
          p.expiration_date,
          p.supermarket_id,
          u.name AS ong_name,
          u.email AS ong_email
        FROM reservations r
        INNER JOIN products p ON p.id = r.product_id
        INNER JOIN users u ON u.id = r.ong_id
        WHERE r.ong_id = $1
        ORDER BY r.reserved_at DESC`,
        [userId]
      );
    }

    // Si es ADMIN, ve todas las reservas
    else if (userRole === "ADMIN") {
      result = await pool.query(
        `SELECT
          r.id,
          r.product_id,
          r.ong_id,
          r.quantity_reserved,
          r.status,
          r.reserved_at,
          p.name AS product_name,
          p.description AS product_description,
          p.category AS product_category,
          p.quantity AS product_quantity,
          p.unit,
          p.expiration_date,
          p.supermarket_id,
          u.name AS ong_name,
          u.email AS ong_email
        FROM reservations r
        INNER JOIN products p ON p.id = r.product_id
        INNER JOIN users u ON u.id = r.ong_id
        ORDER BY r.reserved_at DESC`
      );
    }

    // Si el rol no está autorizado, rechaza la solicitud
    else {
      return res.status(403).json({
        error: "No tenés permisos para ver reservas"
      });
    }

    // Responde con las reservas encontradas
    res.json({
      message: "Reservas obtenidas correctamente",
      reservations: result.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al obtener reservas"
    });
  }
};

// Actualiza el estado de una reserva
const updateReservationStatus = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    // Extrae el ID de la reserva desde la URL
    const { id } = req.params;

    // Extrae el estado nuevo desde el body
    const { status } = req.body || {};

    // Valida formato UUID de la reserva
    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: "El id de la reserva debe tener un formato válido"
      });
    }

    // Valida que se haya enviado un estado
    if (!status) {
      return res.status(400).json({
        error: "El estado de la reserva es obligatorio"
      });
    }

    // Valida que el estado sea permitido
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "Estado de reserva inválido",
        allowedStatuses
      });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    // Busca la reserva con datos del producto asociado
    const reservationResult = await client.query(
      `SELECT
        r.id,
        r.product_id,
        r.ong_id,
        r.quantity_reserved,
        r.status,
        r.reserved_at,
        p.supermarket_id,
        p.name AS product_name,
        p.unit,
        p.quantity AS product_quantity
      FROM reservations r
      INNER JOIN products p ON p.id = r.product_id
      WHERE r.id = $1`,
      [id]
    );

    const reservation = reservationResult.rows[0];

    // Valida que la reserva exista
    if (!reservation) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        error: "Reserva no encontrada"
      });
    }

    // No permite modificar una reserva cancelada
    if (reservation.status === "CANCELLED") {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        error: "La reserva ya está cancelada"
      });
    }

    // No permite modificar una reserva completada
    if (reservation.status === "COMPLETED") {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        error: "La reserva ya fue completada y no puede modificarse"
      });
    }

    const userRole = req.user.role;
    const userId = req.user.id;

    // Valida si el usuario es el supermercado dueño del producto
    const isSupermarketOwner =
      userRole === "SUPERMARKET" && reservation.supermarket_id === userId;

    // Valida si el usuario es la ONG dueña de la reserva
    const isOngOwner =
      userRole === "ONG" && reservation.ong_id === userId;

    // Confirmación de reserva
    if (status === "CONFIRMED") {
      if (!isSupermarketOwner) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(403).json({
          error: "Solo el supermercado dueño del producto puede confirmar la reserva"
        });
      }

      if (reservation.status !== "PENDING") {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          error: "La reserva debe estar pendiente antes de ser confirmada"
        });
      }

      // Notifica a la ONG
      await createNotification(
        client,
        reservation.ong_id,
        "Reserva confirmada",
        `El supermercado confirmó tu reserva del producto "${reservation.product_name}".`,
        "RESERVATION_CONFIRMED"
      );
    }

    // Finalización de reserva
    if (status === "COMPLETED") {
      if (!isSupermarketOwner) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(403).json({
          error: "Solo el supermercado dueño del producto puede completar la reserva"
        });
      }

      if (reservation.status !== "CONFIRMED") {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          error: "La reserva debe estar confirmada antes de ser completada"
        });
      }

      // Notifica a la ONG
      await createNotification(
        client,
        reservation.ong_id,
        "Reserva completada",
        `La reserva del producto "${reservation.product_name}" fue marcada como completada.`,
        "RESERVATION_COMPLETED"
      );
    }

    // Cancelación de reserva
    if (status === "CANCELLED") {
      if (!isSupermarketOwner && !isOngOwner) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(403).json({
          error: "Solo la ONG o el supermercado relacionado pueden cancelar la reserva"
        });
      }

      // Restaura el stock del producto
      const restoredQuantity =
        reservation.product_quantity + reservation.quantity_reserved;

      await client.query(
        `UPDATE products
         SET quantity = $1, status = $2
         WHERE id = $3`,
        [restoredQuantity, "AVAILABLE", reservation.product_id]
      );

      // Si cancela el supermercado, se notifica a la ONG
      if (isSupermarketOwner) {
        await createNotification(
          client,
          reservation.ong_id,
          "Reserva cancelada",
          `El supermercado canceló la reserva del producto "${reservation.product_name}".`,
          "RESERVATION_CANCELLED"
        );
      }

      // Si cancela la ONG, se notifica al supermercado
      if (isOngOwner) {
        await createNotification(
          client,
          reservation.supermarket_id,
          "Reserva cancelada",
          `La ONG canceló una reserva del producto "${reservation.product_name}".`,
          "RESERVATION_CANCELLED"
        );
      }
    }

    // Actualiza el estado de la reserva
    const updatedResult = await client.query(
      `UPDATE reservations
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    // Responde con la reserva actualizada
    res.json({
      message: "Estado de reserva actualizado correctamente",
      reservation: updatedResult.rows[0]
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error(error);

    res.status(500).json({
      error: "Error al actualizar estado de reserva"
    });
  } finally {
    client.release();
  }
};

module.exports = {
  createReservation,
  getReservations,
  updateReservationStatus
};