// Rutas del dashboard para obtener información resumida
const express = require("express");
const router = express.Router();

// Importa middleware de autenticación
const authMiddleware = require("../middlewares/authMiddleware");

const {
  getDashboardSummary,
} = require("../controllers/dashboardController");

// GET /dashboard/summary - Obtiene resumen de métricas del dashboard
router.get("/summary", authMiddleware, getDashboardSummary);

module.exports = router;
