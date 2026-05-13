const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  createReservation,
  getReservations,
  updateReservationStatus,
} = require("../controllers/reservationController");

router.post("/", authMiddleware, roleMiddleware(["ONG"]), createReservation);

router.get("/", authMiddleware, getReservations);

router.put(
  "/:id/status",
  authMiddleware,
  roleMiddleware(["SUPERMARKET", "ONG"]),
  updateReservationStatus
);

module.exports = router;