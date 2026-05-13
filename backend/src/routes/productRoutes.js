const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  createProduct,
  getProducts,
} = require("../controllers/productController");

router.post(
  "/",
  authMiddleware,
  roleMiddleware(["SUPERMARKET"]),
  createProduct
);

router.get(
  "/",
  authMiddleware,
  getProducts
);

module.exports = router;