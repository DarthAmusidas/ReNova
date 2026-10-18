// Middleware que valida la sesión (JWT enviado en la cabecera Authorization)
const { SessionError, verifySessionToken } = require("../services/sessionService");

async function authMiddleware(req, res, next) {
  // Obtiene la cabecera Authorization del request
  const authHeader = req.headers.authorization;

  // Valida que la cabecera Authorization esté presente
  if (!authHeader) {
    return res.status(401).json({
      error: "Token no enviado",
    });
  }

  // Extrae el token del formato "Bearer <token>"
  const token = authHeader.split(" ")[1];

  // Valida que el token esté presente después de "Bearer"
  if (!token) {
    return res.status(401).json({
      error: "Formato de token inválido",
    });
  }

  try {
    // Verifica la firma, el vencimiento y que la sesión siga vigente
    // (usuario existente y sin cambio de contraseña posterior al login).
    req.user = await verifySessionToken(token);

    // Pasa el control al siguiente middleware/ruta
    next();
  } catch (error) {
    if (error instanceof SessionError) {
      return res.status(401).json({
        error: error.message,
      });
    }

    console.error("Error verificando la sesión:", error);

    return res.status(503).json({
      error: "No se pudo verificar la sesión. Probá de nuevo en unos segundos.",
    });
  }
}

module.exports = authMiddleware;
