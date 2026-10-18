// Misma política que el backend (backend/src/utils/passwordPolicy.js):
// mínimo 8 caracteres, al menos una letra y un número.
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_HINT = "Mínimo 8 caracteres, con letras y números";

// Devuelve el mensaje de error o "" si la contraseña es válida.
export const validatePassword = (password = "") => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }

  if (!/\p{L}/u.test(password) || !/\d/.test(password)) {
    return "La contraseña debe incluir al menos una letra y un número.";
  }

  return "";
};
