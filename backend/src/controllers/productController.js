const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      quantity,
      unit,
      expiration_date,
      low_rotation,
    } = req.body;

    const supermarket_id = req.user.id;

    if (!name || !quantity || !unit) {
      return res.status(400).json({
        error: "Nombre, cantidad y unidad son obligatorios",
      });
    }

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

const getProducts = async (req, res) => {
  try {
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