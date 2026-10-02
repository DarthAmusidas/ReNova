// Rutas de reservas para ONG y supermercados
const express = require("express");
const router = express.Router();
// Importa middleware de autenticación
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  createReservation,
  getReservations,
  updateReservationStatus,
} = require("../controllers/reservationController");
const { createPickupQr } = require("../controllers/pickupController");

// POST /reservations - Crea una nueva reserva (requiere ser ONG)
router.post("/", authMiddleware, roleMiddleware(["ONG"]), createReservation);

// GET /reservations - Obtiene las reservas del usuario autenticado
router.get("/", authMiddleware, getReservations);

// PUT /reservations/:id/status - Actualiza el estado de una reserva
router.put(
  "/:id/status",
  authMiddleware,
  roleMiddleware(["SUPERMARKET", "ONG"]),
  updateReservationStatus
);

// POST /reservations/:id/pickup-qr - El comercio genera el QR de entrega
router.post(
  "/:id/pickup-qr",
  authMiddleware,
  roleMiddleware(["SUPERMARKET"]),
  createPickupQr
);

module.exports = router;