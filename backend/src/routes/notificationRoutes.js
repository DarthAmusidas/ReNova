const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  getNotifications,
  markNotificationAsRead,
  markNotificationsAsRead,
} = require("../controllers/notificationController");

// Obtiene las notificaciones del usuario autenticado
router.get("/", authMiddleware, getNotifications);

// Marca todas las notificaciones del usuario autenticado como leídas
router.put("/read/all", authMiddleware, markNotificationsAsRead);

// Marca una notificación puntual como leída
router.put("/:id/read", authMiddleware, markNotificationAsRead);

module.exports = router;