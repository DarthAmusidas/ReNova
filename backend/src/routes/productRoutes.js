// Rutas de productos para supermercados
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  createProduct,
  getProducts,
} = require("../controllers/productController");

// POST /products - Crea un nuevo producto (requiere ser SUPERMARKET)
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["SUPERMARKET"]),
  createProduct
);

// GET /products - Obtiene todos los productos disponibles
router.get(
  "/",
  authMiddleware,
  getProducts
);

module.exports = router;