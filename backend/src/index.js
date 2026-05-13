require("dotenv").config();

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

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/reservations", reservationRoutes);
app.use("/notifications", notificationRoutes);
app.use("/dashboard", dashboardRoutes);
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

app.get("/profile", authMiddleware, (req, res) => {
  res.json({
    message: "Ruta protegida accedida correctamente",
    user: req.user,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});