// Rutas de autenticación: registro e inicio de sesión
const express = require("express");

const router = express.Router();

const {
  register,
  login
} = require("../controllers/authController");

// POST /auth/register - Registra un nuevo usuario
router.post("/register", register);

// POST /auth/login - Inicia sesión y emite un token JWT
router.post("/login", login);

module.exports = router;