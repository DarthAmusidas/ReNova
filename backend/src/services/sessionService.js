// Verificación de sesiones (JWT). La usan el middleware de la API y el chat.
//
// Además de validar la firma y el vencimiento del token, consulta al usuario en
// la base: así una sesión deja de valer si el usuario ya no existe o si cambió
// la contraseña después de iniciar sesión (por ejemplo, porque se la robaron).
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

class SessionError extends Error {}

// 42703: la columna password_changed_at todavía no existe
// (falta correr prisma/session_security.sql). Se sigue validando sin ella.
const findSessionUser = async (userId) => {
  try {
    const result = await pool.query(
      "SELECT id, role, password_changed_at FROM users WHERE id = $1",
      [userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    if (error.code !== "42703") throw error;

    const result = await pool.query("SELECT id, role FROM users WHERE id = $1", [userId]);
    return result.rows[0] || null;
  }
};

// Devuelve { id, role } o lanza SessionError si la sesión no es válida.
const verifySessionToken = async (token) => {
  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new SessionError("Token inválido o expirado");
  }

  const user = await findSessionUser(payload.id);

  if (!user) {
    throw new SessionError("La cuenta ya no existe");
  }

  // iat = momento de emisión del token, en segundos.
  if (user.password_changed_at) {
    const changedAtSeconds = Math.floor(new Date(user.password_changed_at).getTime() / 1000);

    if (payload.iat < changedAtSeconds) {
      throw new SessionError("La sesión se cerró porque se cambió la contraseña");
    }
  }

  // El rol sale de la base, no del token: si un administrador lo cambia,
  // se aplica en el próximo pedido sin esperar a que venza el token.
  return { id: user.id, role: user.role };
};

module.exports = {
  SessionError,
  verifySessionToken,
};
