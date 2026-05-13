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

// Habilita CORS para permitir solicitudes desde otros dominios
app.use(cors());
// Parsea automáticamente JSON en el cuerpo de las solicitudes
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
    // Consulta la hora actual de la base de datos
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
  // El middleware authMiddleware valida el token y añade el usuario a req.user
  res.json({
    message: "Ruta protegida accedida correctamente",
    user: req.user,
  });
});
// Puerto del servidor, por defecto 3000
const PORT = process.env.PORT || 3000;
// Inicia el servidor en el puerto especificado
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});