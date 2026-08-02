const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const {
  TOKEN_TYPES,
  createAuthToken,
  findValidAuthToken,
  markAuthTokenAsUsed,
  invalidateUserTokens,
} = require("../services/authTokenService");
const {
  buildFrontendLink,
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../services/emailService");

const allowedRoles = ["SUPERMARKET", "ONG", "ADMIN"];

const mapOrganizationTypeToRole = (organizationType) => {
  const ongTypes = ["Comedor", "Merendero", "Voluntariado"];
  const supermarketTypes = ["Supermercado", "Almacén", "Verdulería", "Ferretería"];

  if (ongTypes.includes(organizationType)) return "ONG";
  if (supermarketTypes.includes(organizationType)) return "SUPERMARKET";

  return null;
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const buildUserResponse = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  address: user.address,
  organization_type: user.organization_type,
  email_verified_at: user.email_verified_at || null,
  email_verified: Boolean(user.email_verified_at),
  created_at: user.created_at,
});

const sendVerificationForUser = async (user) => {
  const tokenData = await createAuthToken({
    pool,
    userId: user.id,
    type: TOKEN_TYPES.EMAIL_VERIFICATION,
    expiresInMinutes: 24 * 60,
  });

  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    token: tokenData.token,
  });
};

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      address,
      organization_type,
    } = req.body || {};

    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({
        error: "Nombre, email y contraseña son obligatorios",
      });
    }

    let finalRole = role;

    if (organization_type) {
      const mappedRole = mapOrganizationTypeToRole(organization_type);

      if (!mappedRole) {
        return res.status(400).json({
          error: "Tipo de organización no válido",
        });
      }

      finalRole = mappedRole;
    } else if (!finalRole) {
      return res.status(400).json({
        error: "Rol u organización requerida",
      });
    }

    if (!allowedRoles.includes(finalRole) || finalRole === "ADMIN") {
      return res.status(400).json({
        error: "Rol inválido",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    const userExists = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [normalizedEmail]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({
        error: "El usuario ya existe",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users
        (name, email, password, role, phone, address, organization_type)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, phone, address, organization_type, created_at`,
      [
        name,
        normalizedEmail,
        hashedPassword,
        finalRole,
        phone || null,
        address || null,
        organization_type || null,
      ]
    );

    const user = result.rows[0];

    let verificationEmailSent = false;

    try {
      await sendVerificationForUser(user);
      verificationEmailSent = true;
    } catch (emailError) {
      console.error("Error enviando verificación de email:", emailError);
    }

    return res.status(201).json({
      message: verificationEmailSent
        ? "Usuario registrado. Revisá tu email para verificar la cuenta."
        : "Usuario registrado. No se pudo enviar el email de verificación.",
      verificationEmailSent,
      user: buildUserResponse({
        ...user,
        email_verified_at: null,
      }),
    });
  } catch (error) {
    console.error("Error en registro:", error);

    return res.status(500).json({
      error: "Error en registro",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        error: "Email y contraseña son obligatorios",
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [normalizedEmail]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({
        error: "Usuario no encontrado",
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).json({
        error: "Contraseña incorrecta",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "24h",
      }
    );

    return res.json({
      message: "Login exitoso",
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Error en login:", error);

    return res.status(500).json({
      error: "Error en login",
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const token = req.body?.token || req.query?.token;

    if (!token) {
      return res.status(400).json({
        error: "Token requerido",
      });
    }

    const authToken = await findValidAuthToken({
      pool,
      token,
      type: TOKEN_TYPES.EMAIL_VERIFICATION,
    });

    if (!authToken) {
      return res.status(400).json({
        error: "Token inválido o expirado",
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET email_verified_at = COALESCE(email_verified_at, NOW())
       WHERE id = $1
       RETURNING id, name, email, role, phone, address, organization_type, email_verified_at, created_at`,
      [authToken.user_id]
    );

    await markAuthTokenAsUsed({
      pool,
      tokenId: authToken.id,
    });

    return res.json({
      message: "Email verificado correctamente",
      user: buildUserResponse(result.rows[0]),
    });
  } catch (error) {
    console.error("Error verificando email:", error);

    return res.status(500).json({
      error: "Error verificando email",
    });
  }
};

const resendVerification = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (!normalizedEmail) {
      return res.status(400).json({
        error: "Email requerido",
      });
    }

    const result = await pool.query(
      "SELECT id, name, email, email_verified_at FROM users WHERE LOWER(email) = LOWER($1)",
      [normalizedEmail]
    );

    const user = result.rows[0];

    if (!user) {
      return res.json({
        message: "Si el email existe, enviaremos un enlace de verificación.",
      });
    }

    if (user.email_verified_at) {
      return res.json({
        message: "El email ya se encuentra verificado.",
      });
    }

    await sendVerificationForUser(user);

    return res.json({
      message: "Si el email existe, enviaremos un enlace de verificación.",
    });
  } catch (error) {
    console.error("Error reenviando verificación:", error);

    return res.status(500).json({
      error: "Error reenviando verificación",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (!normalizedEmail) {
      return res.status(400).json({
        error: "Email requerido",
      });
    }

    const genericResponse = {
      message:
        "Si el email existe, enviaremos un enlace para restablecer la contraseña.",
    };

    const result = await pool.query(
      "SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)",
      [normalizedEmail]
    );

    const user = result.rows[0];

    if (!user) {
      return res.json(genericResponse);
    }

    const tokenData = await createAuthToken({
      pool,
      userId: user.id,
      type: TOKEN_TYPES.PASSWORD_RESET,
      expiresInMinutes: 30,
    });

    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token: tokenData.token,
    });

    const devResetLink = buildFrontendLink("/reset-password", tokenData.token);

    return res.json({
      ...genericResponse,
      devResetLink:
        process.env.NODE_ENV !== "production" && !process.env.SMTP_HOST
          ? devResetLink
          : undefined,
    });
  } catch (error) {
    console.error("Error en recuperación de contraseña:", error);

    return res.status(500).json({
      error: "Error solicitando recuperación de contraseña",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({
        error: "Token y nueva contraseña son obligatorios",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    const authToken = await findValidAuthToken({
      pool,
      token,
      type: TOKEN_TYPES.PASSWORD_RESET,
    });

    if (!authToken) {
      return res.status(400).json({
        error: "Token inválido o expirado",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `UPDATE users
       SET password = $1,
           email_verified_at = COALESCE(email_verified_at, NOW())
       WHERE id = $2`,
      [hashedPassword, authToken.user_id]
    );

    await markAuthTokenAsUsed({
      pool,
      tokenId: authToken.id,
    });

    await invalidateUserTokens({
      pool,
      userId: authToken.user_id,
      type: TOKEN_TYPES.PASSWORD_RESET,
    });

    return res.json({
      message: "Contraseña actualizada correctamente",
    });
  } catch (error) {
    console.error("Error restableciendo contraseña:", error);

    return res.status(500).json({
      error: "Error restableciendo contraseña",
    });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};


