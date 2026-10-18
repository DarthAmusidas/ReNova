// Política de contraseñas: mínimo 8 caracteres, al menos una letra y un número.
// bcrypt solo usa los primeros 72 bytes, por eso se limita el máximo.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;

// Devuelve el mensaje de error o null si la contraseña es válida.
const validatePassword = (password) => {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`;
  }

  if (Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES) {
    return "La contraseña es demasiado larga";
  }

  if (!/\p{L}/u.test(password) || !/\d/.test(password)) {
    return "La contraseña debe incluir al menos una letra y un número";
  }

  return null;
};

module.exports = {
  PASSWORD_MIN_LENGTH,
  validatePassword,
};
