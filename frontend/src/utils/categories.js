// Compara categorías sin importar mayúsculas, tildes ni espacios de más:
// los productos viejos tienen la categoría cargada como texto libre.
export const normalizeCategory = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

export const findCategoryByName = (categories, name) =>
  categories.find(
    (category) => normalizeCategory(category.name) === normalizeCategory(name)
  ) || null;
