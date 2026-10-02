// Chat en tiempo real entre la ONG y el comercio de una reserva (Socket.IO).
//
// Cada usuario se conecta con su JWT y entra a la sala "user:<id>" (avisos de
// mensajes nuevos para los contadores). Al abrir el chat de una reserva entra a
// "reservation:<id>", donde se reciben los mensajes en vivo.
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { isAllowedOrigin } = require("./utils/allowedOrigins");
const { setIO } = require("./realtime");
const chatService = require("./services/chatService");

// Límite simple contra spam: mensajes por ventana de tiempo y por conexión.
const SEND_WINDOW_MS = 10 * 1000;
const SEND_MAX_IN_WINDOW = 12;

const reservationRoom = (reservationId) => `reservation:${reservationId}`;
const userRoom = (userId) => `user:${userId}`;

const toErrorResponse = (error) => {
  if (error instanceof chatService.ChatError) {
    return { ok: false, error: error.message, code: error.code };
  }

  console.error("Error en el chat:", error);
  return { ok: false, error: "Ocurrió un error en el chat. Probá de nuevo." };
};

// Los eventos responden con un callback (ack). Si el cliente no lo manda, se ignora.
const safeAck = (ack) => (typeof ack === "function" ? ack : () => {});

const isUserInRoom = async (io, room, userId) => {
  const sockets = await io.in(room).fetchSockets();
  return sockets.some((socket) => String(socket.data.user?.id) === String(userId));
};

function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
      credentials: true,
    },
  });

  setIO(io);

  // Autenticación con el mismo JWT que usa la API.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) return next(new Error("UNAUTHORIZED"));

      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.user = { id: user.id, role: user.role, name: user.name };
      socket.data.sentAt = [];

      return next();
    } catch {
      return next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    const { user } = socket.data;

    socket.join(userRoom(user.id));

    // Abre el chat: valida acceso, entra a la sala y devuelve el historial.
    socket.on("chat:join", async ({ reservationId } = {}, ack) => {
      const reply = safeAck(ack);

      try {
        const access = await chatService.getChatAccess(reservationId, user);
        const messages = await chatService.listMessages(reservationId);

        socket.join(reservationRoom(reservationId));

        if (access.isParty) {
          const updated = await chatService.markAsRead(reservationId, user.id);

          if (updated > 0) {
            socket.to(reservationRoom(reservationId)).emit("chat:read", {
              reservationId,
              readerId: user.id,
            });
          }
        }

        reply({
          ok: true,
          messages,
          canWrite: access.canWrite,
          status: access.reservation.status,
          productName: access.reservation.product_name,
          ongName: access.reservation.ong_name,
          supermarketName: access.reservation.supermarket_name,
        });
      } catch (error) {
        reply(toErrorResponse(error));
      }
    });

    socket.on("chat:leave", ({ reservationId } = {}) => {
      if (reservationId) socket.leave(reservationRoom(reservationId));
    });

    socket.on("chat:send", async ({ reservationId, body } = {}, ack) => {
      const reply = safeAck(ack);

      try {
        const now = Date.now();
        socket.data.sentAt = socket.data.sentAt.filter((time) => now - time < SEND_WINDOW_MS);

        if (socket.data.sentAt.length >= SEND_MAX_IN_WINDOW) {
          throw new chatService.ChatError("Estás enviando mensajes muy rápido. Esperá unos segundos.");
        }

        const access = await chatService.getChatAccess(reservationId, user);

        if (!access.isParty) {
          throw new chatService.ChatError(
            "El administrador puede leer el chat, pero no escribir.",
            403,
            "CHAT_READ_ONLY"
          );
        }

        if (!access.canWrite) {
          throw new chatService.ChatError(
            "El chat está cerrado: la reserva ya no está confirmada.",
            400,
            "CHAT_CLOSED"
          );
        }

        const message = await chatService.createMessage(reservationId, user.id, body);
        socket.data.sentAt.push(now);

        io.to(reservationRoom(reservationId)).emit("chat:message", message);
        reply({ ok: true, message });

        // Si la otra parte no tiene el chat abierto: contador y notificación.
        const recipientId = access.otherUserId;
        const recipientIsWatching = await isUserInRoom(
          io,
          reservationRoom(reservationId),
          recipientId
        );

        if (recipientIsWatching) {
          await chatService.markAsRead(reservationId, recipientId);
          io.to(reservationRoom(reservationId)).emit("chat:read", {
            reservationId,
            readerId: recipientId,
          });
        } else {
          io.to(userRoom(recipientId)).emit("chat:unread", { reservationId });
          await chatService.notifyNewMessage({
            reservation: access.reservation,
            recipientId,
            senderName: message.sender_name,
          });
          io.to(userRoom(recipientId)).emit("notifications:changed");
        }
      } catch (error) {
        reply(toErrorResponse(error));
      }
    });

    socket.on("chat:read", async ({ reservationId } = {}) => {
      try {
        const access = await chatService.getChatAccess(reservationId, user);
        if (!access.isParty) return;

        const updated = await chatService.markAsRead(reservationId, user.id);

        if (updated > 0) {
          socket.to(reservationRoom(reservationId)).emit("chat:read", {
            reservationId,
            readerId: user.id,
          });
        }
      } catch {
        // Marcar como leído es secundario: un error no corta el chat.
      }
    });

    socket.on("chat:typing", ({ reservationId } = {}) => {
      if (!reservationId || !socket.rooms.has(reservationRoom(reservationId))) return;

      socket.to(reservationRoom(reservationId)).emit("chat:typing", {
        reservationId,
        userId: user.id,
      });
    });
  });

  return io;
}

module.exports = { setupSocket };
