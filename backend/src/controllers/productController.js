// Controlador de productos para supermercados
const { Pool } = require("pg");

// Conexión a la base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Crea un nuevo producto asociado al supermercado autenticado
const createProduct = async (req, res) => {
  try {
    // Extrae los datos del producto del cuerpo de la solicitud
    const {
      name,
      description,
      category,
      quantity,
      unit,
      expiration_date,
      low_rotation,
    } = req.body;

    // Obtiene el ID del supermercado del usuario autenticado
    const supermarket_id = req.user.id;

    // Valida que los campos obligatorios estén presentes
    if (!name || !quantity || !unit) {
      return res.status(400).json({
        error: "Nombre, cantidad y unidad son obligatorios",
      });
    }

    // Inserta el producto con estado AVAILABLE por defecto
    const result = await pool.query(
      `INSERT INTO products
      (supermarket_id, name, description, category, quantity, unit, expiration_date, low_rotation, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        supermarket_id,
        name,
        description,
        category,
        quantity,
        unit,
        expiration_date,
        low_rotation || false,
        "AVAILABLE",
      ]
    );

    res.status(201).json({
      message: "Producto creado correctamente",
      product: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al crear producto",
    });
  }
};

// Devuelve los productos disponibles para el frontend
const getProducts = async (req, res) => {
  try {
    // Busca todos los productos con estado AVAILABLE
    // Ordena por fecha de vencimiento (primero los que vencen antes)
    const result = await pool.query(
      `SELECT *
       FROM products
       WHERE status = $1
       ORDER BY expiration_date ASC NULLS LAST, created_at DESC`,
      ["AVAILABLE"]
    );

    res.json({
      message: "Productos disponibles",
      products: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al obtener productos",
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
};