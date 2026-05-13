// Rutas para manejar notificaciones del usuario autenticado
const express = require("express");
const router = express.Router();

// Importa middleware de autenticación
const authMiddleware = require("../middlewares/authMiddleware");

const {
  getNotifications,
  markNotificationAsRead,
} = require("../controllers/notificationController");

// GET /notifications - Obtiene las notificaciones del usuario
router.get("/", authMiddleware, getNotifications);

// PUT /notifications/:id/read - Marca una notificación como leída
router.put("/:id/read", authMiddleware, markNotificationAsRead);

module.exports = router;