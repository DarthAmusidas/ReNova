// Entrega con QR: el comercio muestra un QR en su pantalla y quien retira lo
// escanea con la cámara del celular. Se abre /retiro/:token, inicia sesión con
// la cuenta de la ONG y confirma. Solo la ONG dueña de la reserva puede
// confirmarla, así una foto del QR no alcanza para llevarse el pedido.
const pool = require("../db/pool");
const { isValidUUID } = require("../utils/validators");
const { createPickupToken, verifyPickupToken } = require("../utils/pickupToken");
const { emitReservationStatus } = require("../realtime");
const {
  createNotification,
  expireOldOngReservations,
  isConfirmationExpired,
  EXPIRATION_ERROR,
} = require("./reservationController");

const RESERVATION_QUERY = `
  SELECT
    r.*,
    p.name AS product_name,
    p.unit,
    p.supermarket_id,
    ong.name AS ong_name,
    supermarket.name AS supermarket_name
  FROM reservations r
  INNER JOIN products p ON p.id = r.product_id
  INNER JOIN users ong ON ong.id = r.ong_id
  INNER JOIN users supermarket ON supermarket.id = p.supermarket_id
  WHERE r.id = $1
`;

const TOKEN_ERRORS = {
  invalid: "El código QR no es válido. Pedile al comercio que genere uno nuevo.",
  expired: "El código QR venció. Pedile al comercio que genere uno nuevo.",
};

// Solo lo necesario para que quien retira reconozca su pedido.
const toPublicReservation = (reservation, expiresAt) => ({
  status: reservation.status,
  product_name: reservation.product_name,
  quantity: reservation.quantity_reserved,
  unit: reservation.unit,
  supermarket_name: reservation.supermarket_name,
  ong_name: reservation.ong_name,
  pickup_person_name: reservation.pickup_person_name,
  order_code: reservation.order_code,
  expires_at: expiresAt,
});

// POST /reservations/:id/pickup-qr (comercio con sesión iniciada)
const createPickupQr = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "ID de reserva inválido" });
    }

    await expireOldOngReservations();

    const result = await pool.query(RESERVATION_QUERY, [id]);
    const reservation = result.rows[0];

    if (!reservation) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    if (String(reservation.supermarket_id) !== String(req.user.id)) {
      return res.status(403).json({ error: "No tenés permisos sobre esta reserva" });
    }

    if (reservation.status !== "CONFIRMED") {
      return res.status(400).json({
        error: "Solo se puede entregar una reserva confirmada",
      });
    }

    if (isConfirmationExpired(reservation)) {
      return res.status(400).json({ error: EXPIRATION_ERROR });
    }

    const { token, expiresAt } = createPickupToken(reservation.id);

    res.json({ token, expires_at: expiresAt });
  } catch (error) {
    console.error("Error generando QR de retiro:", error);
    res.status(500).json({ error: "No se pudo generar el QR de retiro" });
  }
};

const OTHER_ONG_ERROR =
  "Este QR es de una reserva de otra organización. Iniciá sesión con la cuenta de la ONG que reservó.";

// GET /pickup/:token (ONG de la reserva o comercio que la entrega)
const getPickup = async (req, res) => {
  try {
    const verification = verifyPickupToken(req.params.token);

    if (verification.error === "invalid") {
      return res.status(400).json({ code: "INVALID", error: TOKEN_ERRORS.invalid });
    }

    const result = await pool.query(RESERVATION_QUERY, [verification.reservationId]);
    const reservation = result.rows[0];

    if (!reservation) {
      return res.status(404).json({ code: "INVALID", error: TOKEN_ERRORS.invalid });
    }

    const isOwnerOng = String(reservation.ong_id) === String(req.user.id);
    const isOwnerSupermarket = String(reservation.supermarket_id) === String(req.user.id);

    if (!isOwnerOng && !isOwnerSupermarket) {
      return res.status(403).json({ code: "OTHER_ONG", error: OTHER_ONG_ERROR });
    }

    // Un QR vencido igual informa si la entrega ya se completó.
    if (verification.error === "expired" && reservation.status !== "COMPLETED") {
      return res.status(410).json({ code: "EXPIRED", error: TOKEN_ERRORS.expired });
    }

    const publicReservation = toPublicReservation(reservation, verification.expiresAt);

    // El comercio consulta el estado mientras espera; no recibe el número de pedido.
    if (!isOwnerOng && publicReservation.status !== "COMPLETED") {
      publicReservation.order_code = null;
    }

    res.json({ reservation: publicReservation });
  } catch (error) {
    console.error("Error consultando QR de retiro:", error);
    res.status(500).json({ error: "No se pudo consultar el retiro" });
  }
};

// POST /pickup/:token/confirm (solo la ONG de la reserva)
const confirmPickup = async (req, res) => {
  const verification = verifyPickupToken(req.params.token);

  if (verification.error) {
    const code = verification.error === "expired" ? "EXPIRED" : "INVALID";

    return res
      .status(verification.error === "expired" ? 410 : 400)
      .json({ code, error: TOKEN_ERRORS[verification.error] });
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await expireOldOngReservations();

    await client.query("BEGIN");
    transactionStarted = true;

    const result = await client.query(`${RESERVATION_QUERY} FOR UPDATE OF r`, [
      verification.reservationId,
    ]);
    const reservation = result.rows[0];

    if (!reservation) {
      await client.query("ROLLBACK");
      return res.status(404).json({ code: "INVALID", error: TOKEN_ERRORS.invalid });
    }

    if (String(reservation.ong_id) !== String(req.user.id)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ code: "OTHER_ONG", error: OTHER_ONG_ERROR });
    }

    if (reservation.status === "COMPLETED") {
      await client.query("ROLLBACK");
      return res.json({
        message: "Esta entrega ya estaba confirmada.",
        reservation: toPublicReservation(reservation, verification.expiresAt),
      });
    }

    if (reservation.status !== "CONFIRMED" || isConfirmationExpired(reservation)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Esta reserva ya no se puede entregar. Consultá con el comercio.",
      });
    }

    const updated = await client.query(
      `
      UPDATE reservations
      SET ong_completed = true,
          supermarket_completed = true,
          status = 'COMPLETED'
      WHERE id = $1
      RETURNING *
      `,
      [reservation.id]
    );

    const message = `${reservation.pickup_person_name || "La persona autorizada"} retiró "${reservation.product_name}". La reserva quedó completada.`;

    await createNotification(client, reservation.ong_id, "Retiro completado", message, "RESERVATION_UPDATE");
    await createNotification(client, reservation.supermarket_id, "Entrega completada", message, "RESERVATION_UPDATE");

    await client.query("COMMIT");

    emitReservationStatus(reservation.id, "COMPLETED");

    res.json({
      message: "Entrega confirmada",
      reservation: toPublicReservation(
        { ...reservation, ...updated.rows[0] },
        verification.expiresAt
      ),
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Error confirmando retiro con QR:", error);
    res.status(500).json({ error: "No se pudo confirmar la entrega" });
  } finally {
    client.release();
  }
};

module.exports = {
  createPickupQr,
  getPickup,
  confirmPickup,
};
