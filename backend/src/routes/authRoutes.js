const express = require("express");

const router = express.Router();

const {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { createRateLimiter } = require("../middlewares/rateLimitMiddleware");

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const loginLimiter = createRateLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: 10,
  message: "Demasiados intentos de inicio de sesión. Probá de nuevo en unos minutos.",
});

const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Demasiados registros desde esta conexión. Probá de nuevo más tarde.",
});

const emailLimiter = createRateLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: 5,
  message: "Demasiadas solicitudes de email. Probá de nuevo en unos minutos.",
});

const tokenLimiter = createRateLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: 20,
  message: "Demasiados intentos. Probá de nuevo en unos minutos.",
});

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);

router.post("/verify-email", tokenLimiter, verifyEmail);
router.post("/resend-verification", emailLimiter, resendVerification);
router.post("/forgot-password", emailLimiter, forgotPassword);
router.post("/reset-password", tokenLimiter, resetPassword);

module.exports = router;
