const { Pool } = require("pg");
const { isValidUUID } = require("../utils/validators");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

const createNotification = async (client, userId, title, message, type) => {
  await client.query(
    `
    INSERT INTO notifications
      (user_id, title, message, type)
    VALUES ($1, $2, $3, $4)
    `,
    [userId, title, message, type]
  );
};

const generateUniqueOrderCode = async (client) => {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const randomPart = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");
    const orderCode = `RN-2026-${randomPart}`;

    const existingResult = await client.query(
      `
      SELECT id FROM reservations WHERE order_code = $1 LIMIT 1
      `,
      [orderCode]
    );

    if (existingResult.rows.length === 0) {
      return orderCode;
    }
  }

  throw new Error("No se pudo generar un código de pedido único");
};

const createReservation = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const {
      product_id,
      quantity_reserved,
      pickup_person_name,
      pickup_person_dni,
      pickup_person_phone,
      pickup_notes,
    } = req.body || {};
    const ongId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== "ONG") {
      return res.status(403).json({
        error: "Solo una ONG puede realizar reservas",
      });
    }

    if (!product_id || !quantity_reserved) {
      return res.status(400).json({
        error: "El id del producto y la cantidad a reservar son obligatorios",
      });
    }

    if (!isValidUUID(product_id)) {
      return res.status(400).json({
        error: "El id del producto debe tener un formato válido",
      });
    }

    if (!pickup_person_name || !pickup_person_dni) {
      return res.status(400).json({
        error: "El nombre y DNI de la persona de retirada son obligatorios",
      });
    }

    const quantity = Number(quantity_reserved);

    if (Number.isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({
        error: "La cantidad a reservar debe ser un número mayor a 0",
      });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    const productResult = await client.query(
      `
      SELECT *
      FROM products
      WHERE id = $1
      FOR UPDATE
      `,
      [product_id]
    );

    const product = productResult.rows[0];

    if (!product) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        error: "Producto no encontrado",
      });
    }

    if (product.status !== "AVAILABLE") {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        error: "El producto no está disponible para reservar",
      });
    }

    if (product.expiration_date) {
      const expirationDate = new Date(product.expiration_date);
      const today = new Date();

      today.setHours(0, 0, 0, 0);

      if (expirationDate < today) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          error: "No se puede reservar un producto vencido",
        });
      }
    }

    if (quantity > Number(product.quantity)) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        error: "La cantidad solicitada supera el stock disponible",
      });
    }

    let orderCode;
    try {
      orderCode = await generateUniqueOrderCode(client);
    } catch (error) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(500).json({
        error: "No se pudo generar un código de pedido único",
      });
    }

    const reservationResult = await client.query(
      `
      INSERT INTO reservations
        (
          product_id,
          ong_id,
          quantity_reserved,
          status,
          supermarket_completed,
          ong_completed,
          order_code,
          pickup_person_name,
          pickup_person_dni,
          pickup_person_phone,
          pickup_notes
        )
      VALUES ($1, $2, $3, 'PENDING', false, false, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        product_id,
        ongId,
        quantity,
        orderCode,
        pickup_person_name,
        pickup_person_dni,
        pickup_person_phone || null,
        pickup_notes || null,
      ]
    );

    const reservation = reservationResult.rows[0];

    const newQuantity = Number(product.quantity) - quantity;
    const newStatus = newQuantity === 0 ? "UNAVAILABLE" : "AVAILABLE";

    await client.query(
      `
      UPDATE products
      SET quantity = $1,
          status = $2
      WHERE id = $3
      `,
      [newQuantity, newStatus, product_id]
    );

    await createNotification(
      client,
      product.supermarket_id,
      "Nueva reserva recibida",
      `Una ONG reservó ${quantity} ${product.unit || "unidades"} del producto "${product.name}".`,
      "RESERVATION_REQUEST"
    );

    await client.query("COMMIT");
    transactionStarted = false;

    res.status(201).json({
      message: "Reserva creada correctamente",
      reservation,
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error("Error al crear reserva:", error);

    res.status(500).json({
      error: "Error al crear reserva",
    });
  } finally {
    client.release();
  }
};

const getReservations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let result;

    if (userRole === "SUPERMARKET") {
      result = await pool.query(
        `
        SELECT
          r.id,
          r.product_id,
          r.ong_id,
          r.quantity_reserved,
          r.status,
          r.reserved_at,
          r.supermarket_completed,
          r.ong_completed,
          r.order_code,
          r.pickup_person_name,
          r.pickup_person_dni,
          r.pickup_person_phone,
          r.pickup_notes,
          p.name AS product_name,
          p.description AS product_description,
          p.category AS product_category,
          p.quantity AS product_quantity,
          p.unit,
          p.expiration_date,
          p.supermarket_id,
          ong.name AS ong_name,
          ong.email AS ong_email,
          supermarket.name AS supermarket_name,
          supermarket.email AS supermarket_email
        FROM reservations r
        INNER JOIN products p ON p.id = r.product_id
        INNER JOIN users ong ON ong.id = r.ong_id
        INNER JOIN users supermarket ON supermarket.id = p.supermarket_id
        WHERE p.supermarket_id = $1
        ORDER BY r.reserved_at DESC
        `,
        [userId]
      );
    } else if (userRole === "ONG") {
      result = await pool.query(
        `
        SELECT
          r.id,
          r.product_id,
          r.ong_id,
          r.quantity_reserved,
          r.status,
          r.reserved_at,
          r.supermarket_completed,
          r.ong_completed,
          r.order_code,
          r.pickup_person_name,
          r.pickup_person_dni,
          r.pickup_person_phone,
          r.pickup_notes,
          p.name AS product_name,
          p.description AS product_description,
          p.category AS product_category,
          p.quantity AS product_quantity,
          p.unit,
          p.expiration_date,
          p.supermarket_id,
          ong.name AS ong_name,
          ong.email AS ong_email,
          supermarket.name AS supermarket_name,
          supermarket.email AS supermarket_email
        FROM reservations r
        INNER JOIN products p ON p.id = r.product_id
        INNER JOIN users ong ON ong.id = r.ong_id
        INNER JOIN users supermarket ON supermarket.id = p.supermarket_id
        WHERE r.ong_id = $1
        ORDER BY r.reserved_at DESC
        `,
        [userId]
      );
    } else if (userRole === "ADMIN") {
      result = await pool.query(
        `
        SELECT
          r.id,
          r.product_id,
          r.ong_id,
          r.quantity_reserved,
          r.status,
          r.reserved_at,
          r.supermarket_completed,
          r.ong_completed,
          r.order_code,
          r.pickup_person_name,
          r.pickup_person_dni,
          r.pickup_person_phone,
          r.pickup_notes,
          p.name AS product_name,
          p.description AS product_description,
          p.category AS product_category,
          p.quantity AS product_quantity,
          p.unit,
          p.expiration_date,
          p.supermarket_id,
          ong.name AS ong_name,
          ong.email AS ong_email,
          supermarket.name AS supermarket_name,
          supermarket.email AS supermarket_email
        FROM reservations r
        INNER JOIN products p ON p.id = r.product_id
        INNER JOIN users ong ON ong.id = r.ong_id
        INNER JOIN users supermarket ON supermarket.id = p.supermarket_id
        ORDER BY r.reserved_at DESC
        `
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
    console.error("Error al obtener reservas:", error);

    res.status(500).json({
      error: "Error al obtener reservas",
    });
  }
};

const updateReservationStatus = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["CONFIRMED", "CANCELLED", "COMPLETED"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "Estado no válido",
      });
    }

    await client.query("BEGIN");

    const reservationResult = await client.query(
      `
      SELECT
        r.*,
        p.name AS product_name,
        p.quantity AS product_quantity,
        p.unit,
        p.supermarket_id,
        ong.name AS ong_name,
        supermarket.name AS supermarket_name
      FROM reservations r
      INNER JOIN products p ON p.id = r.product_id
      INNER JOIN users ong ON ong.id = r.ong_id
      INNER JOIN users supermarket ON supermarket.id = p.supermarket_id
      WHERE r.id = $1
      FOR UPDATE
      `,
      [id]
    );

    if (reservationResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "Reserva no encontrada",
      });
    }

    const reservation = reservationResult.rows[0];

    const isReservationSupermarket =
      String(reservation.supermarket_id) === String(userId);

    const isReservationOng = String(reservation.ong_id) === String(userId);

    if (!isReservationSupermarket && !isReservationOng && userRole !== "ADMIN") {
      await client.query("ROLLBACK");

      return res.status(403).json({
        error: "No tenés permisos para modificar esta reserva",
      });
    }

    if (reservation.status === "COMPLETED") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error: "La reserva ya fue completada y no puede modificarse",
      });
    }

    if (reservation.status === "CANCELLED") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error: "La reserva fue cancelada y no puede modificarse",
      });
    }

    let updatedReservation;

    if (status === "CONFIRMED") {
      if (!isReservationSupermarket || userRole !== "SUPERMARKET") {
        await client.query("ROLLBACK");

        return res.status(403).json({
          error: "Solo el supermercado puede confirmar la reserva",
        });
      }

      if (reservation.status !== "PENDING") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: "Solo se pueden confirmar reservas pendientes",
        });
      }

      const result = await client.query(
        `
        UPDATE reservations
        SET status = 'CONFIRMED'
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      updatedReservation = result.rows[0];

      await createNotification(
        client,
        reservation.ong_id,
        "Reserva confirmada",
        `El supermercado confirmó tu reserva del producto "${reservation.product_name}".`,
        "RESERVATION_UPDATE"
      );
    }

    if (status === "CANCELLED") {
      if (!isReservationSupermarket && !isReservationOng) {
        await client.query("ROLLBACK");

        return res.status(403).json({
          error: "Solo la ONG o el supermercado relacionado pueden cancelar la reserva",
        });
      }

      const restoredQuantity =
        Number(reservation.product_quantity || 0) +
        Number(reservation.quantity_reserved || 0);

      await client.query(
        `
        UPDATE products
        SET quantity = $1,
            status = 'AVAILABLE'
        WHERE id = $2
        `,
        [restoredQuantity, reservation.product_id]
      );

      const result = await client.query(
        `
        UPDATE reservations
        SET status = 'CANCELLED'
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      updatedReservation = result.rows[0];

      if (isReservationSupermarket) {
        await createNotification(
          client,
          reservation.ong_id,
          "Reserva cancelada",
          `El supermercado canceló la reserva del producto "${reservation.product_name}".`,
          "RESERVATION_CANCELLED"
        );
      }

      if (isReservationOng) {
        await createNotification(
          client,
          reservation.supermarket_id,
          "Reserva cancelada",
          `La ONG canceló una reserva del producto "${reservation.product_name}".`,
          "RESERVATION_CANCELLED"
        );
      }
    }

    if (status === "COMPLETED") {
      if (reservation.status !== "CONFIRMED") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: "Solo se puede completar una reserva confirmada",
        });
      }

      if (isReservationSupermarket && userRole === "SUPERMARKET") {
        if (reservation.supermarket_completed) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            error: "El supermercado ya confirmó la entrega",
          });
        }

        const partialResult = await client.query(
          `
          UPDATE reservations
          SET supermarket_completed = true
          WHERE id = $1
          RETURNING *
          `,
          [id]
        );

        updatedReservation = partialResult.rows[0];

        await createNotification(
          client,
          reservation.ong_id,
          "Producto entregado",
          `El supermercado marcó como entregado el producto "${reservation.product_name}". Confirmá la recepción para cerrar la reserva.`,
          "RESERVATION_UPDATE"
        );
      } else if (isReservationOng && userRole === "ONG") {
        if (reservation.ong_completed) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            error: "La ONG ya confirmó la recepción",
          });
        }

        const partialResult = await client.query(
          `
          UPDATE reservations
          SET ong_completed = true
          WHERE id = $1
          RETURNING *
          `,
          [id]
        );

        updatedReservation = partialResult.rows[0];

        await createNotification(
          client,
          reservation.supermarket_id,
          "Producto recibido",
          `La ONG marcó como recibido el producto "${reservation.product_name}".`,
          "RESERVATION_UPDATE"
        );
      } else {
        await client.query("ROLLBACK");

        return res.status(403).json({
          error: "No tenés permisos para completar esta reserva",
        });
      }

      const shouldComplete =
        updatedReservation.supermarket_completed === true &&
        updatedReservation.ong_completed === true;

      if (shouldComplete) {
        const completedResult = await client.query(
          `
          UPDATE reservations
          SET status = 'COMPLETED'
          WHERE id = $1
          RETURNING *
          `,
          [id]
        );

        updatedReservation = completedResult.rows[0];

        await createNotification(
          client,
          reservation.ong_id,
          "Reserva completada",
          `La reserva del producto "${reservation.product_name}" fue completada correctamente.`,
          "RESERVATION_UPDATE"
        );

        await createNotification(
          client,
          reservation.supermarket_id,
          "Reserva completada",
          `La reserva del producto "${reservation.product_name}" fue completada correctamente.`,
          "RESERVATION_UPDATE"
        );
      }
    }

    await client.query("COMMIT");

    res.json({
      message: "Reserva actualizada correctamente",
      reservation: updatedReservation,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error al actualizar estado de reserva:", error);

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