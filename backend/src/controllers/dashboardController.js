// Controlador de dashboard / resumen general
const { Pool } = require("pg");
// Conexión a la base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
// Obtiene el resumen del dashboard según el rol del usuario autenticado
const getDashboardSummary = async (req, res) => {
  try {
    // El usuario y rol se obtienen desde el token JWT
    const userId = req.user.id;
    const userRole = req.user.role;
    let summary = {};
    // Resumen para supermercado
    if (userRole === "SUPERMARKET") {
      // Cuenta productos disponibles propios
      const productsResult = await pool.query(
        `SELECT COUNT(*)::int AS products_available
         FROM products
         WHERE supermarket_id = $1
         AND status = 'AVAILABLE'`,
        [userId]
      );
      // Cuenta reservas asociadas a productos del supermercado
      const reservationsResult = await pool.query(
        `SELECT
          COUNT(*)::int AS total_reservations,
          COUNT(*) FILTER (WHERE r.status = 'PENDING')::int AS reservations_pending,
          COUNT(*) FILTER (WHERE r.status = 'CONFIRMED')::int AS reservations_confirmed,
          COUNT(*) FILTER (WHERE r.status = 'COMPLETED')::int AS reservations_completed,
          COUNT(*) FILTER (WHERE r.status = 'CANCELLED')::int AS reservations_cancelled
        FROM reservations r
        INNER JOIN products p ON p.id = r.product_id
        WHERE p.supermarket_id = $1`,
        [userId]
      );
      // Cuenta notificaciones no leídas del supermercado
      const notificationsResult = await pool.query(
        `SELECT COUNT(*)::int AS unread_notifications
         FROM notifications
         WHERE user_id = $1
         AND is_read = false`,
        [userId]
      );

      summary = {
        role: userRole,
        products_available: productsResult.rows[0].products_available,
        total_reservations: reservationsResult.rows[0].total_reservations,
        reservations_pending: reservationsResult.rows[0].reservations_pending,
        reservations_confirmed: reservationsResult.rows[0].reservations_confirmed,
        reservations_completed: reservationsResult.rows[0].reservations_completed,
        reservations_cancelled: reservationsResult.rows[0].reservations_cancelled,
        unread_notifications: notificationsResult.rows[0].unread_notifications
      };
    }

    // Resumen para ONG
    else if (userRole === "ONG") {
      // Cuenta todos los productos disponibles
      const productsResult = await pool.query(
        `SELECT COUNT(*)::int AS products_available
         FROM products
         WHERE status = 'AVAILABLE'`
      );

      // Cuenta reservas propias de la ONG
      const reservationsResult = await pool.query(
        `SELECT
          COUNT(*)::int AS total_reservations,
          COUNT(*) FILTER (WHERE status = 'PENDING')::int AS reservations_pending,
          COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS reservations_confirmed,
          COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS reservations_completed,
          COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS reservations_cancelled
        FROM reservations
        WHERE ong_id = $1`,
        [userId]
      );
      // Cuenta notificaciones no leídas de la ONG
      const notificationsResult = await pool.query(
        `SELECT COUNT(*)::int AS unread_notifications
         FROM notifications
         WHERE user_id = $1
         AND is_read = false`,
        [userId]
      );
      summary = {
        role: userRole,
        products_available: productsResult.rows[0].products_available,
        total_reservations: reservationsResult.rows[0].total_reservations,
        reservations_pending: reservationsResult.rows[0].reservations_pending,
        reservations_confirmed: reservationsResult.rows[0].reservations_confirmed,
        reservations_completed: reservationsResult.rows[0].reservations_completed,
        reservations_cancelled: reservationsResult.rows[0].reservations_cancelled,
        unread_notifications: notificationsResult.rows[0].unread_notifications
      };
    }

    // Resumen para ADMIN
    else if (userRole === "ADMIN") {
      // Cuenta todos los productos disponibles
      const productsResult = await pool.query(
        `SELECT COUNT(*)::int AS products_available
         FROM products
         WHERE status = 'AVAILABLE'`
      );

      // Cuenta todas las reservas
      const reservationsResult = await pool.query(
        `SELECT
          COUNT(*)::int AS total_reservations,
          COUNT(*) FILTER (WHERE status = 'PENDING')::int AS reservations_pending,
          COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS reservations_confirmed,
          COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS reservations_completed,
          COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS reservations_cancelled
        FROM reservations`
      );

      // Cuenta todas las notificaciones no leídas
      const notificationsResult = await pool.query(
        `SELECT COUNT(*)::int AS unread_notifications
         FROM notifications
         WHERE is_read = false`
      );

      summary = {
        role: userRole,
        products_available: productsResult.rows[0].products_available,
        total_reservations: reservationsResult.rows[0].total_reservations,
        reservations_pending: reservationsResult.rows[0].reservations_pending,
        reservations_confirmed: reservationsResult.rows[0].reservations_confirmed,
        reservations_completed: reservationsResult.rows[0].reservations_completed,
        reservations_cancelled: reservationsResult.rows[0].reservations_cancelled,
        unread_notifications: notificationsResult.rows[0].unread_notifications
      };
    }

    // Si el rol no es válido, rechaza la solicitud
    else {
      return res.status(403).json({
        error: "Rol no autorizado para ver el resumen"
      });
    }

    // Responde con el resumen calculado
    res.json({
      message: "Resumen obtenido correctamente",
      summary
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al obtener resumen del dashboard"
    });
  }
};

module.exports = {
  getDashboardSummary
};