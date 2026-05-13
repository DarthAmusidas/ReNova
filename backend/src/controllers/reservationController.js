// Controlador de reservas para ONG y supermercados
const { Pool } = require("pg");

// Conexión a la base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Crea una nueva reserva y ajusta la cantidad del producto reservado
const createReservation = async (req, res) => {
  // Inicia una transacción para garantizar consistencia de datos
  const client = await pool.connect();

  try {
    // Extrae el ID del producto y cantidad del cuerpo de la solicitud
    const { product_id, quantity_reserved } = req.body;
    // Obtiene el ID de la ONG del usuario autenticado
    const ong_id = req.user.id;
    // Convierte a número para evitar problemas de tipo
    const quantity = Number(quantity_reserved);

    // Valida los parámetros de entrada
    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({
        error: "product_id y quantity_reserved son obligatorios y deben ser válidos",
      });
    }

    // Inicia una transacción de base de datos
    await client.query("BEGIN");

    // Busca el producto en la base de datos
    const productResult = await client.query(
      "SELECT * FROM products WHERE id = $1",
      [product_id]
    );

    const product = productResult.rows[0];

    if (!product) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Producto no encontrado",
      });
    }

    if (product.status !== "AVAILABLE") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "El producto no está disponible para reservar",
      });
    }

    if (quantity > product.quantity) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "La cantidad solicitada excede la cantidad disponible",
      });
    }

    const reservationResult = await client.query(
      `INSERT INTO reservations
       (product_id, ong_id, quantity_reserved, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [product_id, ong_id, quantity, "PENDING"]
    );

    const newQuantity = product.quantity - quantity;
    const newStatus = newQuantity > 0 ? "AVAILABLE" : "UNAVAILABLE";

    await client.query(
      `UPDATE products
       SET quantity = $1, status = $2
       WHERE id = $3`,
      [newQuantity, newStatus, product_id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Reserva creada correctamente",
      reservation: reservationResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);

    res.status(500).json({
      error: "Error al crear la reserva",
    });
  } finally {
    client.release();
  }
};

// Obtiene las reservas relacionadas con el usuario autenticado
const getReservations = async (req, res) => {
  try {
    // Obtiene el ID y rol del usuario autenticado
    const userId = req.user.id;
    const userRole = req.user.role;
    let result;

    // Si es SUPERMARKET, devuelve reservas de sus propios productos
    if (userRole === "SUPERMARKET") {
      result = await pool.query(
        `SELECT r.*, p.name AS product_name, p.supermarket_id, u.name AS ong_name, u.email AS ong_email
         FROM reservations r
         INNER JOIN products p ON p.id = r.product_id
         LEFT JOIN users u ON u.id = r.ong_id
         WHERE p.supermarket_id = $1
         ORDER BY r.created_at DESC`,
        [userId]
      );
    } else if (userRole === "ONG") {
      result = await pool.query(
        `SELECT r.*, p.name AS product_name, p.supermarket_id, u.name AS ong_name, u.email AS ong_email
         FROM reservations r
         INNER JOIN products p ON p.id = r.product_id
         LEFT JOIN users u ON u.id = r.ong_id
         WHERE r.ong_id = $1
         ORDER BY r.created_at DESC`,
        [userId]
      );
    } else {
      return res.status(403).json({
        error: "No tenés permisos para ver reservas",
      });
    }

    res.json({
      message: "Reservas obtenidas",
      reservations: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al obtener reservas",
    });
  }
};

// Actualiza el estado de una reserva y gestiona la lógica de confirmación/cancelación
const updateReservationStatus = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
    ];

    if (!status) {
      return res.status(400).json({
        error: "El estado es obligatorio",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "Estado inválido",
        allowedStatuses,
      });
    }

    await client.query("BEGIN");

    const reservationResult = await client.query(
      `SELECT 
        r.*,
        p.supermarket_id,
        p.quantity AS product_quantity,
        p.status AS product_status
      FROM reservations r
      INNER JOIN products p ON p.id = r.product_id
      WHERE r.id = $1`,
      [id]
    );

    const reservation = reservationResult.rows[0];

    if (!reservation) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Reserva no encontrada",
      });
    }

    if (reservation.status === "CANCELLED") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "La reserva ya está cancelada",
      });
    }

    if (reservation.status === "COMPLETED") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "La reserva ya fue completada y no puede modificarse",
      });
    }

    const userRole = req.user.role;
    const userId = req.user.id;

    const isSupermarketOwner =
      userRole === "SUPERMARKET" && reservation.supermarket_id === userId;

    const isOngOwner =
      userRole === "ONG" && reservation.ong_id === userId;

    if (status === "CONFIRMED" || status === "COMPLETED") {
      if (!isSupermarketOwner) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          error: "Solo el supermercado dueño del producto puede confirmar o completar la reserva",
        });
      }
    }

    if (status === "COMPLETED") {
      if (reservation.status !== "CONFIRMED") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "La reserva debe estar CONFIRMED antes de marcarla como COMPLETED",
        });
      }
    }

    if (status === "CANCELLED") {
      if (!isSupermarketOwner && !isOngOwner) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          error: "Solo la ONG o el supermercado relacionado pueden cancelar la reserva",
        });
      }

      const restoredQuantity =
        reservation.product_quantity + reservation.quantity_reserved;

      await client.query(
        `UPDATE products
         SET quantity = $1, status = $2
         WHERE id = $3`,
        [restoredQuantity, "AVAILABLE", reservation.product_id]
      );
    }

    const updatedResult = await client.query(
      `UPDATE reservations
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    await client.query("COMMIT");

    res.json({
      message: "Estado de reserva actualizado correctamente",
      reservation: updatedResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      error: "Error al actualizar estado de reserva",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  createReservation,
  getReservations,
  updateReservationStatus,
};