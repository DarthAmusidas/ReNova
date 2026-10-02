// Orígenes que pueden usar la API y el chat (CORS).
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

module.exports = {
  allowedOrigins,
  isAllowedOrigin,
};
