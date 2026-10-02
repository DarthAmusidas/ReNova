// Rutas REST del chat de reservas. Los mensajes en vivo van por Socket.IO
// (src/socket.js); acá se consultan el historial y los contadores.
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const chatService = require("../services/chatService");

const handleError = (res, error) => {
  if (error instanceof chatService.ChatError) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }

  console.error("Error en el chat:", error);
  return res.status(500).json({ error: "Error al obtener los mensajes" });
};

// GET /reservations/chat/summary - Mensajes totales y sin leer por reserva
router.get("/chat/summary", authMiddleware, async (req, res) => {
  try {
    res.json({ summary: await chatService.getSummary(req.user) });
  } catch (error) {
    handleError(res, error);
  }
});

// GET /reservations/:id/messages - Historial del chat de una reserva
router.get("/:id/messages", authMiddleware, async (req, res) => {
  try {
    const access = await chatService.getChatAccess(req.params.id, req.user);
    const messages = await chatService.listMessages(req.params.id);

    res.json({ messages, canWrite: access.canWrite, status: access.reservation.status });
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;
