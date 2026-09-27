// Etiqueta visible del perfil: usa el tipo de organización real
// (Merendero, Verdulería…) en lugar de un genérico por rol.
const ORGANIZATION_LABELS = {
  comedor: "Comedor",
  merendero: "Merendero",
  voluntariado: "Voluntariado",
  supermercado: "Supermercado",
  almacen: "Almacén",
  verduleria: "Verdulería",
  ferreteria: "Ferretería",
};

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

export const getUserRoleLabel = (user) => {
  if (user?.role === "ADMIN") return "Administrador";

  const label = ORGANIZATION_LABELS[normalize(user?.organization_type)];
  if (label) return label;

  if (user?.role === "SUPERMARKET") return "Comercio";
  if (user?.role === "ONG") return "Organización social";

  return "Usuario";
};
