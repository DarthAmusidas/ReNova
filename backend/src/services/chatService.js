// Lógica del chat entre la ONG y el comercio de una reserva.
// La usan el servidor de Socket.IO (tiempo real) y las rutas REST (historial).
const pool = require("../db/pool");
const { isValidUUID } = require("../utils/validators");
const { isConfirmationExpired } = require("../controllers/reservationController");

const MAX_MESSAGE_LENGTH = 1000;
const HISTORY_LIMIT = 500;

// Estados en los que el chat existe: se abre al confirmar y después queda como
// historial de solo lectura.
const READABLE_STATUSES = ["CONFIRMED", "COMPLETED", "CANCELLED"];

class ChatError extends Error {
  constructor(message, status = 400, code = "CHAT_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// 42P01 = la tabla no existe todavía (falta prisma/reservation_messages.sql).
const isMissingTable = (error) => error?.code === "42P01";

const MISSING_TABLE_ERROR = new ChatError(
  "El chat todavía no está disponible. Falta preparar la base de datos.",
  503,
  "CHAT_UNAVAILABLE"
);

const getReservationForChat = async (reservationId) => {
  const result = await pool.query(
    `
    SELECT
      r.id,
      r.status,
      r.ong_id,
      r.reserved_at,
      r.ong_completed,
      p.supermarket_id,
      p.name AS product_name,
      ong.name AS ong_name,
      supermarket.name AS supermarket_name
    FROM reservations r
    INNER JOIN products p ON p.id = r.product_id
    INNER JOIN users ong ON ong.id = r.ong_id
    INNER JOIN users supermarket ON supermarket.id = p.supermarket_id
    WHERE r.id = $1
    `,
    [reservationId]
  );

  return result.rows[0] || null;
};

// Valida que el usuario pueda ver (y opcionalmente escribir) el chat.
const getChatAccess = async (reservationId, user) => {
  if (!isValidUUID(reservationId)) {
    throw new ChatError("Reserva inválida", 400);
  }

  const reservation = await getReservationForChat(reservationId);

  if (!reservation) {
    throw new ChatError("Reserva no encontrada", 404);
  }

  const isOng = String(reservation.ong_id) === String(user.id);
  const isSupermarket = String(reservation.supermarket_id) === String(user.id);
  const isAdmin = user.role === "ADMIN";

  if (!isOng && !isSupermarket && !isAdmin) {
    throw new ChatError("No tenés acceso a este chat", 403);
  }

  if (!READABLE_STATUSES.includes(reservation.status)) {
    throw new ChatError(
      "El chat se habilita cuando el comercio confirma la reserva.",
      400,
      "CHAT_NOT_OPEN"
    );
  }

  const canWrite =
    (isOng || isSupermarket) &&
    reservation.status === "CONFIRMED" &&
    !isConfirmationExpired(reservation);

  return {
    reservation,
    isParty: isOng || isSupermarket,
    canWrite,
    otherUserId: isOng ? reservation.supermarket_id : isSupermarket ? reservation.ong_id : null,
  };
};

const MESSAGE_COLUMNS = `
  m.id,
  m.reservation_id,
  m.sender_id,
  u.name AS sender_name,
  u.role AS sender_role,
  m.body,
  m.created_at,
  m.read_at
`;

const listMessages = async (reservationId) => {
  try {
    const result = await pool.query(
      `
      SELECT * FROM (
        SELECT ${MESSAGE_COLUMNS}
        FROM reservation_messages m
        INNER JOIN users u ON u.id = m.sender_id
        WHERE m.reservation_id = $1
        ORDER BY m.created_at DESC
        LIMIT ${HISTORY_LIMIT}
      ) recent
      ORDER BY created_at ASC
      `,
      [reservationId]
    );

    return result.rows;
  } catch (error) {
    if (isMissingTable(error)) throw MISSING_TABLE_ERROR;
    throw error;
  }
};

const createMessage = async (reservationId, senderId, rawBody) => {
  const body = String(rawBody || "").trim();

  if (!body) {
    throw new ChatError("El mensaje está vacío.");
  }

  if (body.length > MAX_MESSAGE_LENGTH) {
    throw new ChatError(`El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres.`);
  }

  try {
    const result = await pool.query(
      `
      WITH inserted AS (
        INSERT INTO reservation_messages (reservation_id, sender_id, body)
        VALUES ($1, $2, $3)
        RETURNING *
      )
      SELECT ${MESSAGE_COLUMNS}
      FROM inserted m
      INNER JOIN users u ON u.id = m.sender_id
      `,
      [reservationId, senderId, body]
    );

    return result.rows[0];
  } catch (error) {
    if (isMissingTable(error)) throw MISSING_TABLE_ERROR;
    throw error;
  }
};

// Marca como leídos los mensajes que le mandaron al usuario.
const markAsRead = async (reservationId, userId) => {
  try {
    const result = await pool.query(
      `
      UPDATE reservation_messages
      SET read_at = NOW()
      WHERE reservation_id = $1
        AND sender_id <> $2
        AND read_at IS NULL
      `,
      [reservationId, userId]
    );

    return result.rowCount;
  } catch (error) {
    if (isMissingTable(error)) return 0;
    throw error;
  }
};

// Mensajes del otro lado que el usuario todavía no leyó en esa reserva.
const countUnread = async (reservationId, userId) => {
  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS unread
    FROM reservation_messages
    WHERE reservation_id = $1
      AND sender_id <> $2
      AND read_at IS NULL
    `,
    [reservationId, userId]
  );

  return result.rows[0]?.unread || 0;
};

// Total de mensajes y no leídos por reserva, para las tarjetas.
const getSummary = async (user) => {
  try {
    const isAdmin = user.role === "ADMIN";

    const result = await pool.query(
      `
      SELECT
        m.reservation_id,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE m.sender_id <> $1 AND m.read_at IS NULL
        )::int AS unread
      FROM reservation_messages m
      INNER JOIN reservations r ON r.id = m.reservation_id
      INNER JOIN products p ON p.id = r.product_id
      WHERE $2::boolean OR r.ong_id = $1 OR p.supermarket_id = $1
      GROUP BY m.reservation_id
      `,
      [user.id, isAdmin]
    );

    return Object.fromEntries(
      result.rows.map((row) => [
        row.reservation_id,
        { total: row.total, unread: isAdmin ? 0 : row.unread },
      ])
    );
  } catch (error) {
    if (isMissingTable(error)) return {};
    throw error;
  }
};

// Una sola notificación por reserva hasta que el destinatario lea el chat.
const notifyNewMessage = async ({ reservation, recipientId, senderName }) => {
  const unread = await countUnread(reservation.id, recipientId);

  if (unread !== 1) return;

  const title = "Nuevo mensaje";
  const message = `${senderName} te escribió sobre la reserva de "${reservation.product_name}".`;

  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'NEW_MESSAGE')`,
      [recipientId, title, message]
    );
  } catch (error) {
    // 23514: la base todavía no acepta el tipo NEW_MESSAGE.
    if (error.code !== "23514") throw error;

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'RESERVATION_UPDATE')`,
      [recipientId, title, message]
    );
  }
};

module.exports = {
  ChatError,
  MAX_MESSAGE_LENGTH,
  getChatAccess,
  listMessages,
  createMessage,
  markAsRead,
  getSummary,
  notifyNewMessage,
};
