// Límite de intentos en memoria por IP y ruta. Alcanza para una sola instancia de Render;
// con varias instancias habría que moverlo a un almacenamiento compartido.
const createRateLimiter = ({ windowMs, max, message }) => {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();

    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));

      return res.status(429).json({
        error: message,
      });
    }

    return next();
  };
};

module.exports = {
  createRateLimiter,
};
