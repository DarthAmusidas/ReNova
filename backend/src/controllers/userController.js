const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

const getUsers = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== "ADMIN") {
      return res.status(403).json({
        error: "Solo un administrador puede ver los usuarios",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        phone,
        address,
        organization_type,
        created_at
      FROM users
      ORDER BY created_at DESC
      `
    );

    res.json({
      message: "Usuarios obtenidos correctamente",
      users: result.rows,
    });
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);

    res.status(500).json({
      error: "Error obteniendo usuarios",
    });
  }
};

module.exports = {
  getUsers,
};