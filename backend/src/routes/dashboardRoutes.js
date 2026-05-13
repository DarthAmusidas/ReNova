const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  getDashboardSummary,
} = require("../controllers/dashboardController");

router.get("/summary", authMiddleware, getDashboardSummary);

module.exports = router;
