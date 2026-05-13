// Middleware que valida el token JWT enviado en la cabecera Authorization
const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
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
    // Verifica y decodifica el token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Almacena la información del usuario decodificada en req.user
    req.user = decoded;

    // Pasa el control al siguiente middleware/ruta
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Token inválido o expirado",
    });
  }
}

module.exports = authMiddleware;