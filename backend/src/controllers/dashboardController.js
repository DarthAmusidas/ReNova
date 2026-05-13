// Controlador del dashboard para resumen de datos según el rol
const { Pool } = require("pg");

// Conexión a la base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Genera un resumen de métricas para el dashboard según el rol del usuario
const getDashboardSummary = async (req, res) => {
  try {
    // Obtiene el ID y rol del usuario autenticado
    const userId = req.user.id;
    const userRole = req.user.role;
    let summary = {};
    // Si es SUPERM, obtiene estadísticas de sus productos y reservas
    if (userRole === "SUPERMARKET") {
      const productsResult = await pool.query(
        `SELECT COUNT(*)::int AS products_available
         FROM products
         WHERE supermarket_id = $1
         AND status = 'AVAILABLE'`,
        [userId]
      );

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
        unread_notifications: notificationsResult.rows[0].unread_notifications,
      };
    } else if (userRole === "ONG") {
      const productsResult = await pool.query(
        `SELECT COUNT(*)::int AS products_available
         FROM products
         WHERE status = 'AVAILABLE'`
      );

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
        unread_notifications: notificationsResult.rows[0].unread_notifications,
      };
    } else if (userRole === "ADMIN") {
      const productsResult = await pool.query(
        `SELECT COUNT(*)::int AS products_available
         FROM products
         WHERE status = 'AVAILABLE'`
      );

      const reservationsResult = await pool.query(
        `SELECT
          COUNT(*)::int AS total_reservations,
          COUNT(*) FILTER (WHERE status = 'PENDING')::int AS reservations_pending,
          COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS reservations_confirmed,
          COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS reservations_completed,
          COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS reservations_cancelled
        FROM reservations`
      );

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
        unread_notifications: notificationsResult.rows[0].unread_notifications,
      };
    } else {
      return res.status(403).json({
        error: "Rol no autorizado para ver el resumen",
      });
    }

    res.json({
      message: "Resumen obtenido correctamente",
      summary,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al obtener resumen del dashboard",
    });
  }
};

module.exports = {
  getDashboardSummary,
};