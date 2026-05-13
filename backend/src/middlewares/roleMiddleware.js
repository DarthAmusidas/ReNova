// Middleware para validar que el usuario tenga uno de los roles permitidos
function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    // Verifica que el usuario esté autenticado
    if (!req.user) {
      return res.status(401).json({
        error: "Usuario no autenticado",
      });
    }
    // Verifica que el rol del usuario esté en la lista de roles permitidos
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "No tenés permisos para realizar esta acción",
      });
    }
    // Si el usuario tiene permisos, pasa al siguiente middleware/ruta
    next();
  };
}
module.exports = roleMiddleware;