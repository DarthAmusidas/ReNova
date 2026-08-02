require("dotenv").config({ quiet: true });

const express = require("express");
const cors = require("cors");

const pool = require("./db/pool");

const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const authMiddleware = require("./middlewares/authMiddleware");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  process.env.FRONTEND_URL,
].filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (allowedOrigins.includes(origin)) return true;

  try {
    const url = new URL(origin);

    if (url.hostname === "localhost") return true;
    if (url.hostname === "127.0.0.1") return true;
    if (url.hostname.endsWith(".vercel.app")) return true;

    return false;
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      console.warn("CORS bloqueado para origin:", origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.use("/users", userRoutes);
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
      message: "Backend ReNova funcionando",
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

app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    method: req.method,
    path: req.originalUrl,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log("Origins permitidos:", allowedOrigins);
});
