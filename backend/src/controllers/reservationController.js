const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Crear notificación interna
 */
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

/**
 * Crear reserva
 * Solo ONG
 */
const createReservation = async (req, res) => {
  const client = await pool.connect();

  try {
    const { product_id, quantity_reserved } = req.body;
    const ong_id = req.user.id;
    const quantity = Number(quantity_reserved);

    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({
        error: "product_id y quantity_reserved son obligatorios y deben ser válidos",
      });
    }

    await client.query("BEGIN");

    const productResult = await client.query(
      `SELECT *
       FROM products
       WHERE id = $1`,
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
        error: "La cantidad solicitada supera el stock disponible",
      });
    }

    const reservationResult = await client.query(
      `INSERT INTO reservations
        (product_id, ong_id, quantity_reserved, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [product_id, ong_id, quantity, "PENDING"]
    );

    const reservation = reservationResult.rows[0];

    const newQuantity = product.quantity - quantity;
    const newStatus = newQuantity === 0 ? "RESERVED" : "AVAILABLE";

    await client.query(
      `UPDATE products
       SET quantity = $1, status = $2
       WHERE id = $3`,
      [newQuantity, newStatus, product_id]
    );

    await createNotification(
      client,
      product.supermarket_id,
      "Nueva reserva recibida",
      `Una ONG reservó ${quantity} ${product.unit} del producto "${product.name}".`,
      "RESERVATION_CREATED"
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Reserva creada correctamente",
      reservation,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      error: "Error al crear reserva",
    });
  } finally {
    client.release();
  }
};

/**
 * Obtener reservas
 */
const getReservations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let result;

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
    } else if (userRole === "ONG") {
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
    } else if (userRole === "ADMIN") {
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
    } else {
      return res.status(403).json({
        error: "No tenés permisos para ver reservas",
      });
    }

    res.json({
      message: "Reservas obtenidas correctamente",
      reservations: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al obtener reservas",
    });
  }
};

/**
 * Actualizar estado de reserva
 */
const updateReservationStatus = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "PENDING",
      "CONFIRMED",
      "CANCELLED",
      "COMPLETED",
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

    if (status === "CONFIRMED") {
      if (!isSupermarketOwner) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          error: "Solo el supermercado dueño del producto puede confirmar la reserva",
        });
      }

      if (reservation.status !== "PENDING") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "La reserva debe estar PENDING antes de marcarla como CONFIRMED",
        });
      }

      await createNotification(
        client,
        reservation.ong_id,
        "Reserva confirmada",
        `El supermercado confirmó tu reserva del producto "${reservation.product_name}".`,
        "RESERVATION_CONFIRMED"
      );
    }

    if (status === "COMPLETED") {
      if (!isSupermarketOwner) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          error: "Solo el supermercado dueño del producto puede completar la reserva",
        });
      }

      if (reservation.status !== "CONFIRMED") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "La reserva debe estar CONFIRMED antes de marcarla como COMPLETED",
        });
      }

      await createNotification(
        client,
        reservation.ong_id,
        "Reserva completada",
        `La reserva del producto "${reservation.product_name}" fue marcada como completada.`,
        "RESERVATION_COMPLETED"
      );
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

      if (isSupermarketOwner) {
        await createNotification(
          client,
          reservation.ong_id,
          "Reserva cancelada",
          `El supermercado canceló la reserva del producto "${reservation.product_name}".`,
          "RESERVATION_CANCELLED"
        );
      }

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