// Carga las variables de entorno desde el archivo .env
require("dotenv").config();

// Importa librerías necesarias para el servidor
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const authMiddleware = require("./middlewares/authMiddleware");

const app = express();

// Orígenes permitidos para consumir la API
// FRONTEND_URL se configura en Render cuando tengamos la URL de Vercel
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  process.env.FRONTEND_URL,
].filter(Boolean);

// Habilita CORS para permitir solicitudes desde el frontend
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Parsea automáticamente JSON en el cuerpo de las solicitudes
app.use(express.json());

// Conexión a la base de datos PostgreSQL / Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Rutas montadas por módulo para mejor organización
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/reservations", reservationRoutes);
app.use("/notifications", notificationRoutes);
app.use("/dashboard", dashboardRoutes);

// Ruta principal para verificar que el backend está activo y conectado a BD
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      ok: true,
      message: "Backend ReNova funcionando 🚀",
      database_time: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      error: "Error conectando con Supabase",
    });
  }
});

// Ruta protegida que requiere autenticación válida
app.get("/profile", authMiddleware, (req, res) => {
  res.json({
    message: "Ruta protegida accedida correctamente",
    user: req.user,
  });
});

// Middleware para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    method: req.method,
    path: req.originalUrl,
  });
});

// Puerto del servidor, por defecto 3000
const PORT = process.env.PORT || 3000;

// Inicia el servidor en el puerto especificado
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});