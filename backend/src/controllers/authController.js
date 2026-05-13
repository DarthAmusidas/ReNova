const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      address
    } = req.body;

    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({
        error: "El usuario ya existe"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users
      (name, email, password, role, phone, address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role`,
      [
        name,
        email,
        hashedPassword,
        role,
        phone,
        address
      ]
    );

    res.status(201).json({
      message: "Usuario registrado",
      user: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error en registro"
    });
  }
};

const login = async (req, res) => {
  try {

    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({
        error: "Usuario no encontrado"
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(400).json({
        error: "Contraseña incorrecta"
      });
    }

    const token = jwt.sign(
  {
    id: user.id,
    role: user.role
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "24h"
  }
);

    res.json({
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error en login"
    });
  }
};

module.exports = {
  register,
  login
};