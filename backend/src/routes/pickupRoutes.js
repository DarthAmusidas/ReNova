// Rutas del retiro con QR. Requieren sesión: el comercio consulta el estado y
// la ONG dueña de la reserva confirma el retiro desde su celular.
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const { getPickup, confirmPickup } = require("../controllers/pickupController");

router.get("/:token", authMiddleware, roleMiddleware(["ONG", "SUPERMARKET"]), getPickup);
router.post("/:token/confirm", authMiddleware, roleMiddleware(["ONG"]), confirmPickup);

module.exports = router;
