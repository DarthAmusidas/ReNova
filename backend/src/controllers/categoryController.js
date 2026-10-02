// Controlador de categorías de productos
const pool = require("../db/pool");
const { isValidUUID } = require("../utils/validators");

// Lista de respaldo mientras no se haya corrido prisma/product_categories.sql.
// Sin id: los productos se guardan solo con el nombre en products.category.
const FALLBACK_CATEGORIES = [
  { slug: "almacen", name: "Almacén", is_perishable: false },
  { slug: "lacteos", name: "Lácteos", is_perishable: true },
  { slug: "frutas-verduras", name: "Frutas y verduras", is_perishable: true },
  { slug: "panificados", name: "Panificados", is_perishable: true },
  { slug: "carnes", name: "Carnes y pescados", is_perishable: true },
  { slug: "congelados", name: "Congelados", is_perishable: true },
  { slug: "conservas", name: "Conservas y enlatados", is_perishable: false },
  { slug: "bebidas", name: "Bebidas", is_perishable: false },
  { slug: "infantil", name: "Alimentos infantiles", is_perishable: false },
  { slug: "higiene-limpieza", name: "Higiene y limpieza", is_perishable: false },
  { slug: "ferreteria", name: "Ferretería", is_perishable: false },
  { slug: "otros", name: "Otros", is_perishable: false },
].map((category) => ({ id: null, ...category }));

// 42P01 = la tabla no existe (migración pendiente).
const isMissingTable = (error) => error?.code === "42P01";

const getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, name, is_perishable
       FROM product_categories
       WHERE active = true
       ORDER BY sort_order ASC, name ASC`
    );

    res.json({ categories: result.rows });
  } catch (error) {
    if (isMissingTable(error)) {
      return res.json({ categories: FALLBACK_CATEGORIES });
    }

    console.error(error);
    res.status(500).json({ error: "Error al obtener categorías" });
  }
};

// Devuelve { id, name } de la categoría elegida, o null si no se envió.
// Lanza un error con status 400 si la categoría no existe.
const resolveCategory = async ({ category_id, category }) => {
  const name = typeof category === "string" ? category.trim() : "";

  if (!category_id && !name) return null;

  try {
    if (category_id) {
      if (!isValidUUID(category_id)) {
        throw Object.assign(new Error("Categoría inválida"), { status: 400 });
      }

      const result = await pool.query(
        `SELECT id, name FROM product_categories WHERE id = $1 AND active = true`,
        [category_id]
      );

      if (!result.rows[0]) {
        throw Object.assign(new Error("La categoría elegida no existe"), { status: 400 });
      }

      return result.rows[0];
    }

    const result = await pool.query(
      `SELECT id, name FROM product_categories
       WHERE lower(name) = lower($1) AND active = true
       LIMIT 1`,
      [name]
    );

    return result.rows[0] || { id: null, name };
  } catch (error) {
    if (isMissingTable(error)) return { id: null, name };
    throw error;
  }
};

module.exports = {
  getCategories,
  resolveCategory,
};
