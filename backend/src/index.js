require("dotenv").config({ quiet: true });

const http = require("http");
const express = require("express");
const cors = require("cors");

const pool = require("./db/pool");

const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const pickupRoutes = require("./routes/pickupRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const authMiddleware = require("./middlewares/authMiddleware");
const chatRoutes = require("./routes/chatRoutes");
const { allowedOrigins, isAllowedOrigin } = require("./utils/allowedOrigins");
const { setupSocket } = require("./socket");

const app = express();

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

// Render está detrás de un proxy: así req.ip es la IP real del cliente (lo usa el límite de intentos).
app.set("trust proxy", 1);

app.use(express.json());

app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/reservations", chatRoutes);
app.use("/reservations", reservationRoutes);
app.use("/pickup", pickupRoutes);
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

// Un solo servidor HTTP para la API y el chat en tiempo real (Socket.IO).
const server = http.createServer(app);
setupSocket(server);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log("Origins permitidos:", allowedOrigins);
});
