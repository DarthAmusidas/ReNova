// Referencia al servidor de Socket.IO para avisar cambios desde los controladores
// sin depender del módulo del chat (evita dependencias circulares).
let io = null;

const setIO = (server) => {
  io = server;
};

// Avisa a quienes tienen abierto el chat de una reserva que cambió su estado
// (por ejemplo, se completó y el chat pasa a solo lectura).
const emitReservationStatus = (reservationId, status) => {
  if (!io || !reservationId) return;

  io.to(`reservation:${reservationId}`).emit("chat:status", {
    reservationId: String(reservationId),
    status,
  });
};

const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;

  io.to(`user:${userId}`).emit(event, payload);
};

module.exports = {
  setIO,
  emitReservationStatus,
  emitToUser,
};
