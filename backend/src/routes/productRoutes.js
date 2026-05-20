const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

// Crea un producto
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["SUPERMARKET"]),
  createProduct
);

// Lista productos
router.get(
  "/",
  authMiddleware,
  getProducts
);

// Edita un producto
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["SUPERMARKET", "ADMIN"]),
  updateProduct
);

// Elimina un producto
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["SUPERMARKET", "ADMIN"]),
  deleteProduct
);

module.exports = router;