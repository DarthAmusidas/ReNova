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

const getConfirmationDeadline = (reservedAt) => {
  if (!reservedAt) return null;

  const reservedDate = new Date(reservedAt);

  if (Number.isNaN(reservedDate.getTime())) return null;

  return new Date(reservedDate.getTime() + 48 * 60 * 60 * 1000);
};

const EXPIRATION_ERROR =
  "La reserva venció porque pasaron más de 48 horas. Debés realizar una nueva reserva.";

const isConfirmationExpired = (reservation) => {
  if (
    !reservation ||
    !["PENDING", "CONFIRMED"].includes(reservation.status) ||
    reservation.ong_completed === true
  ) {
    return false;
  }

  const deadline = getConfirmationDeadline(reservation.reserved_at);

  if (!deadline) return false;

  return new Date() > deadline;
};

const expireOldOngReservations = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const expiredResult = await client.query(
      `
      SELECT
        r.id,
        r.product_id,
        r.quantity_reserved,
        p.quantity AS product_quantity
      FROM reservations r
      INNER JOIN products p ON p.id = r.product_id
      WHERE r.status IN ('PENDING', 'CONFIRMED')
        AND COALESCE(r.ong_completed, false) = false
        AND r.reserved_at IS NOT NULL
        AND NOW() > r.reserved_at + INTERVAL '48 hours'
      FOR UPDATE OF r, p
      `
    );

    for (const reservation of expiredResult.rows) {
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

      await client.query(
        `
        UPDATE reservations
        SET status = 'CANCELLED'
        WHERE id = $1
        `,
        [reservation.id]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error expiring old ONG reservations:", error);
  } finally {
    client.release();
  }
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
      pickup_time,
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

    // Enforce reservation quantity limit
    const availableQuantity = Number(product.quantity);
    let maxAllowedQuantity;

    if (availableQuantity <= 0) {
      maxAllowedQuantity = 0;
    } else if (availableQuantity <= 10) {
      maxAllowedQuantity = availableQuantity;
    } else {
      maxAllowedQuantity = Math.ceil(availableQuantity * 0.5);
    }

    if (quantity > maxAllowedQuantity) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        error: `No se puede reservar más de ${maxAllowedQuantity} ${product.unit || "unidades"} del stock disponible.`,
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
          pickup_notes,
          pickup_time
        )
      VALUES ($1, $2, $3, 'PENDING', false, false, $4, $5, $6, $7, $8, $9)
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
        pickup_time || null,
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
    await expireOldOngReservations();

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
          CASE
            WHEN r.reserved_at IS NULL THEN NULL
            ELSE r.reserved_at + INTERVAL '48 hours'
          END AS confirmation_deadline,
          CASE
            WHEN r.status IN ('PENDING', 'CONFIRMED')
             AND COALESCE(r.ong_completed, false) = false
             AND r.reserved_at IS NOT NULL
             AND NOW() > r.reserved_at + INTERVAL '48 hours'
            THEN true
            ELSE false
          END AS is_confirmation_expired,
          CASE
            WHEN r.reserved_at IS NULL THEN NULL
            ELSE GREATEST(
              0,
              FLOOR(EXTRACT(EPOCH FROM (r.reserved_at + INTERVAL '48 hours' - NOW())) * 1000)
            )::bigint
          END AS confirmation_time_remaining_ms,
          r.supermarket_completed,
          r.ong_completed,
          r.order_code,
          r.pickup_person_name,
          r.pickup_person_dni,
          r.pickup_person_phone,
          r.pickup_notes,
          r.pickup_time,
          p.name AS product_name,
          p.description AS product_description,
          p.category AS product_category,
          p.quantity AS product_quantity,
          p.unit,
          p.expiration_date,
          p.supermarket_id,
          ong.name AS ong_name,
          ong.email AS ong_email,
          ong.organization_type,
          supermarket.name AS supermarket_name,
          supermarket.email AS supermarket_email,
          supermarket.organization_type AS supermarket_organization_type
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
          CASE
            WHEN r.reserved_at IS NULL THEN NULL
            ELSE r.reserved_at + INTERVAL '48 hours'
          END AS confirmation_deadline,
          CASE
            WHEN r.status IN ('PENDING', 'CONFIRMED')
             AND COALESCE(r.ong_completed, false) = false
             AND r.reserved_at IS NOT NULL
             AND NOW() > r.reserved_at + INTERVAL '48 hours'
            THEN true
            ELSE false
          END AS is_confirmation_expired,
          CASE
            WHEN r.reserved_at IS NULL THEN NULL
            ELSE GREATEST(
              0,
              FLOOR(EXTRACT(EPOCH FROM (r.reserved_at + INTERVAL '48 hours' - NOW())) * 1000)
            )::bigint
          END AS confirmation_time_remaining_ms,
          r.supermarket_completed,
          r.ong_completed,
          r.order_code,
          r.pickup_person_name,
          r.pickup_person_dni,
          r.pickup_person_phone,
          r.pickup_notes,
          r.pickup_time,
          p.name AS product_name,
          p.description AS product_description,
          p.category AS product_category,
          p.quantity AS product_quantity,
          p.unit,
          p.expiration_date,
          p.supermarket_id,
          ong.name AS ong_name,
          ong.email AS ong_email,
          ong.organization_type,
          supermarket.name AS supermarket_name,
          supermarket.email AS supermarket_email,
          supermarket.organization_type AS supermarket_organization_type
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
          CASE
            WHEN r.reserved_at IS NULL THEN NULL
            ELSE r.reserved_at + INTERVAL '48 hours'
          END AS confirmation_deadline,
          CASE
            WHEN r.status IN ('PENDING', 'CONFIRMED')
             AND COALESCE(r.ong_completed, false) = false
             AND r.reserved_at IS NOT NULL
             AND NOW() > r.reserved_at + INTERVAL '48 hours'
            THEN true
            ELSE false
          END AS is_confirmation_expired,
          CASE
            WHEN r.reserved_at IS NULL THEN NULL
            ELSE GREATEST(
              0,
              FLOOR(EXTRACT(EPOCH FROM (r.reserved_at + INTERVAL '48 hours' - NOW())) * 1000)
            )::bigint
          END AS confirmation_time_remaining_ms,
          r.supermarket_completed,
          r.ong_completed,
          r.order_code,
          r.pickup_person_name,
          r.pickup_person_dni,
          r.pickup_person_phone,
          r.pickup_notes,
          r.pickup_time,
          p.name AS product_name,
          p.description AS product_description,
          p.category AS product_category,
          p.quantity AS product_quantity,
          p.unit,
          p.expiration_date,
          p.supermarket_id,
          ong.name AS ong_name,
          ong.email AS ong_email,
          ong.organization_type,
          supermarket.name AS supermarket_name,
          supermarket.email AS supermarket_email,
          supermarket.organization_type AS supermarket_organization_type
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
    const { status, validation_code, delivery_code } = req.body || {};

    const allowedStatuses = ["CONFIRMED", "CANCELLED", "COMPLETED"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "Estado no válido",
      });
    }

    await expireOldOngReservations();

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

    const deadline = getConfirmationDeadline(reservation.reserved_at);
    const wasCancelledByExpiration =
      reservation.status === "CANCELLED" &&
      reservation.ong_completed !== true &&
      deadline &&
      new Date() > deadline;

    if (
      status === "COMPLETED" &&
      isReservationOng &&
      userRole === "ONG" &&
      wasCancelledByExpiration
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error: EXPIRATION_ERROR,
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

      if (isConfirmationExpired(reservation)) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: EXPIRATION_ERROR,
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
      if (isConfirmationExpired(reservation)) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: EXPIRATION_ERROR,
        });
      }

      if (reservation.status !== "CONFIRMED") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: "Solo se puede completar una reserva confirmada",
        });
      }

      // ONG confirms pickup first
      if (isReservationOng && userRole === "ONG") {
        if (reservation.ong_completed) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            error: "La ONG ya confirmó el retiro",
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
          "Retiro confirmado",
          `La ONG confirmó el retiro del producto "${reservation.product_name}". Por favor, confirmá que realizaste la entrega.`,
          "RESERVATION_UPDATE"
        );
      } 
      // Supermarket confirms delivery (only after ONG confirms pickup)
      else if (isReservationSupermarket && userRole === "SUPERMARKET") {
        if (!reservation.ong_completed) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            error: "El supermercado solo puede confirmar entrega después de que la ONG confirme el retiro",
          });
        }

        if (reservation.supermarket_completed) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            error: "El supermercado ya confirmó la entrega",
          });
        }

        const submittedDeliveryCode = String(
          delivery_code ?? validation_code ?? ""
        )
          .trim()
          .toUpperCase();

        if (!submittedDeliveryCode) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            error: "Debe ingresar el código de entrega.",
          });
        }

        if (!reservation.order_code) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            error: "Esta reserva no tiene código de entrega disponible.",
          });
        }

        const expectedDeliveryCode = String(reservation.order_code)
          .trim()
          .toUpperCase();

        if (submittedDeliveryCode !== expectedDeliveryCode) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            error:
              "El código ingresado no coincide con el comprobante de la reserva.",
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
          "Entrega confirmada",
          `El supermercado confirmó la entrega del producto "${reservation.product_name}". La reserva está completa.`,
          "RESERVATION_UPDATE"
        );
      } else {
        await client.query("ROLLBACK");

        return res.status(403).json({
          error: "No tenés permisos para confirmar esta reserva",
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
