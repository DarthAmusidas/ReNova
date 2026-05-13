// Controlador de productos
const { Pool } = require("pg");

// Conexión a la base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Crea un nuevo producto publicado por un supermercado
const createProduct = async (req, res) => {
  try {
    // Extrae los datos del cuerpo de la solicitud
    const {
      name,
      description,
      category,
      quantity,
      unit,
      expiration_date,
      low_rotation
    } = req.body || {};

    // El supermercado se obtiene desde el token JWT
    const supermarket_id = req.user.id;

    // Valida campos obligatorios
    if (!name || !quantity || !unit || !expiration_date) {
      return res.status(400).json({
        error: "Nombre, cantidad, unidad y fecha de vencimiento son obligatorios"
      });
    }

    // Convierte la cantidad a número
    const parsedQuantity = Number(quantity);

    // Valida que la cantidad sea numérica y mayor a cero
    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({
        error: "La cantidad debe ser un número mayor a 0"
      });
    }

    // Convierte y valida la fecha de vencimiento
    const expirationDate = new Date(expiration_date);

    if (Number.isNaN(expirationDate.getTime())) {
      return res.status(400).json({
        error: "La fecha de vencimiento no es válida"
      });
    }

    // No permite cargar productos vencidos
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expirationDate < today) {
      return res.status(400).json({
        error: "No se puede cargar un producto vencido"
      });
    }

    // Inserta el producto en la base de datos
    const result = await pool.query(
      `INSERT INTO products
      (supermarket_id, name, description, category, quantity, unit, expiration_date, low_rotation, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        supermarket_id,
        name,
        description || null,
        category || null,
        parsedQuantity,
        unit,
        expiration_date,
        low_rotation || false,
        "AVAILABLE"
      ]
    );

    // Responde con el producto creado
    res.status(201).json({
      message: "Producto creado correctamente",
      product: result.rows[0]
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al crear producto"
    });
  }
};

// Obtiene los productos disponibles
const getProducts = async (req, res) => {
  try {
    // Busca productos disponibles ordenados por vencimiento
    const result = await pool.query(
      `SELECT *
       FROM products
       WHERE status = $1
       ORDER BY expiration_date ASC NULLS LAST, created_at DESC`,
      ["AVAILABLE"]
    );

    // Responde con la lista de productos disponibles
    res.json({
      message: "Productos disponibles",
      products: result.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al obtener productos"
    });
  }
};

module.exports = {
  createProduct,
  getProducts
};