// Utilidades generales de validación
// Valida si un valor tiene formato UUID válido
const isValidUUID = (value) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};
module.exports = {
  isValidUUID
};