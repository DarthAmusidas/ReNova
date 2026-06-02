// Controlador de autenticación / registro de usuarios
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

// Conexión a la base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Roles permitidos por el sistema
const allowedRoles = ["SUPERMARKET", "ONG", "ADMIN"];

// Map organization_type to internal role
const mapOrganizationTypeToRole = (organizationType) => {
  const ongTypes = ["Comedor", "Merendero", "Voluntariado"];
  const supermarketTypes = ["Supermercado", "Almacén", "Verdulería", "Ferretería"];

  if (ongTypes.includes(organizationType)) {
    return "ONG";
  }
  if (supermarketTypes.includes(organizationType)) {
    return "SUPERMARKET";
  }
  return null;
};

// Registra un nuevo usuario en la base de datos
const register = async (req, res) => {
  try {
    // Extrae los datos del cuerpo de la solicitud
    // Se usa req.body || {} para evitar errores si el body viene vacío o mal enviado
    const {
      name,
      email,
      password,
      role,
      phone,
      address,
      organization_type
    } = req.body || {};

    // Valida campos obligatorios
    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Nombre, email y contraseña son obligatorios"
      });
    }

    // Determine role: if organization_type is provided, map it to role; otherwise use provided role
    let finalRole = role;
    if (organization_type) {
      const mappedRole = mapOrganizationTypeToRole(organization_type);
      if (!mappedRole) {
        return res.status(400).json({
          error: "Tipo de organización no válido"
        });
      }
      finalRole = mappedRole;
    } else if (!finalRole) {
      return res.status(400).json({
        error: "Rol u organización requerida"
      });
    }

    // Valida que el rol sea uno de los permitidos (no allow ADMIN from signup)
    if (!allowedRoles.includes(finalRole) || finalRole === "ADMIN") {
      return res.status(400).json({
        error: "Rol inválido"
      });
    }

    // Valida longitud mínima de contraseña
    if (password.length < 6) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 6 caracteres"
      });
    }

    // Verifica si el correo ya está registrado
    const userExists = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({
        error: "El usuario ya existe"
      });
    }

    // Encripta la contraseña con bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Inserta el nuevo usuario en la base de datos
    const result = await pool.query(
      `INSERT INTO users
      (name, email, password, role, phone, address, organization_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, email, role, phone, address, organization_type, created_at`,
      [
        name,
        email,
        hashedPassword,
        finalRole,
        phone || null,
        address || null,
        organization_type || null
      ]
    );

    // Responde con los datos del usuario creado sin exponer la contraseña
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

// Inicia sesión y emite un token JWT para el usuario
const login = async (req, res) => {
  try {
    // Extrae email y contraseña del cuerpo de la solicitud
    const { email, password } = req.body || {};

    // Valida campos obligatorios
    if (!email || !password) {
      return res.status(400).json({
        error: "Email y contraseña son obligatorios"
      });
    }

    // Busca el usuario por email en la base de datos
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    // Valida que el usuario exista
    if (!user) {
      return res.status(400).json({
        error: "Usuario no encontrado"
      });
    }

    // Compara la contraseña ingresada con la almacenada
    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(400).json({
        error: "Contraseña incorrecta"
      });
    }

    // Genera un token JWT válido por 24 horas
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

    // Devuelve el token y la información del usuario autenticado
    res.json({
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization_type: user.organization_type
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