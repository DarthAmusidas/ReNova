// Controlador de dashboard / resumen general
const { Pool } = require("pg");

// Conexion a la base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const LEVELS = [
  { level: 1, min: 0, next: 5, label: "Impacto inicial" },
  { level: 2, min: 5, next: 15, label: "Impacto en crecimiento" },
  { level: 3, min: 15, next: 35, label: "Impacto consolidado" },
  { level: 4, min: 35, next: 75, label: "Alto impacto" },
  { level: 5, min: 75, next: null, label: "Referente solidario" },
];

const calculateImpactLevel = (completedCount) => {
  const completed = Number(completedCount || 0);
  const currentLevel = [...LEVELS]
    .reverse()
    .find((item) => completed >= item.min);

  const nextTarget = currentLevel.next;
  const progressPercentage = nextTarget
    ? Math.min(100, Math.round((completed / nextTarget) * 100))
    : 100;

  return {
    impact_level: currentLevel.level,
    impact_level_label: currentLevel.label,
    completed_count_for_level: completed,
    next_level_target: nextTarget,
    level_progress_percentage: progressPercentage,
  };
};

const toNumber = (value) => Number(value || 0);

const roundMetric = (value) => Math.round(Number(value || 0) * 100) / 100;

const getMarketImpactReport = async (supermarketId) => {
  const productsResult = await pool.query(
    `SELECT COUNT(*)::int AS total_products_published
     FROM products
     WHERE supermarket_id = $1`,
    [supermarketId]
  );

  const reservationsResult = await pool.query(
    `SELECT
       COUNT(*)::int AS total_reservations_received,
       COUNT(*) FILTER (WHERE r.status = 'COMPLETED')::int AS completed_reservations,
       COUNT(*) FILTER (WHERE r.status = 'PENDING')::int AS pending_reservations,
       COUNT(*) FILTER (WHERE r.status = 'CANCELLED')::int AS cancelled_reservations,
       COUNT(DISTINCT r.ong_id) FILTER (WHERE r.status = 'COMPLETED')::int AS distinct_ongs_helped,
       COALESCE(SUM(r.quantity_reserved) FILTER (WHERE r.status = 'COMPLETED'), 0)::numeric AS total_quantity_delivered
     FROM reservations r
     INNER JOIN products p ON p.id = r.product_id
     WHERE p.supermarket_id = $1`,
    [supermarketId]
  );

  const topOngsResult = await pool.query(
    `SELECT
       u.id,
       u.name,
       u.organization_type,
       COUNT(*)::int AS total_reservations,
       COUNT(*) FILTER (WHERE r.status = 'COMPLETED')::int AS completed_reservations,
       COALESCE(SUM(r.quantity_reserved) FILTER (WHERE r.status = 'COMPLETED'), 0)::numeric AS total_quantity_delivered
     FROM reservations r
     INNER JOIN products p ON p.id = r.product_id
     INNER JOIN users u ON u.id = r.ong_id
     WHERE p.supermarket_id = $1
     GROUP BY u.id, u.name, u.organization_type
     ORDER BY completed_reservations DESC, total_reservations DESC, u.name ASC
     LIMIT 5`,
    [supermarketId]
  );

  const monthlyResult = await pool.query(
    `SELECT
       TO_CHAR(DATE_TRUNC('month', r.reserved_at), 'YYYY-MM') AS month,
       COUNT(*)::int AS completed_deliveries,
       COALESCE(SUM(r.quantity_reserved), 0)::numeric AS total_quantity_delivered
     FROM reservations r
     INNER JOIN products p ON p.id = r.product_id
     WHERE p.supermarket_id = $1
       AND r.status = 'COMPLETED'
       AND r.reserved_at IS NOT NULL
     GROUP BY DATE_TRUNC('month', r.reserved_at)
     ORDER BY DATE_TRUNC('month', r.reserved_at) ASC`,
    [supermarketId]
  );

  const stats = reservationsResult.rows[0] || {};
  const totalReservations = toNumber(stats.total_reservations_received);
  const completedReservations = toNumber(stats.completed_reservations);
  const totalQuantityDelivered = toNumber(stats.total_quantity_delivered);
  const estimatedKgRecovered = totalQuantityDelivered * 0.5;

  return {
    total_products_published: toNumber(
      productsResult.rows[0]?.total_products_published
    ),
    total_reservations_received: totalReservations,
    completed_reservations: completedReservations,
    pending_reservations: toNumber(stats.pending_reservations),
    cancelled_reservations: toNumber(stats.cancelled_reservations),
    distinct_ongs_helped: toNumber(stats.distinct_ongs_helped),
    total_quantity_delivered: roundMetric(totalQuantityDelivered),
    estimated_kg_recovered: roundMetric(estimatedKgRecovered),
    estimated_co2_avoided: roundMetric(estimatedKgRecovered * 2),
    estimated_water_saved: roundMetric(estimatedKgRecovered * 4),
    utilization_rate:
      totalReservations === 0
        ? 0
        : roundMetric((completedReservations / totalReservations) * 100),
    top_ongs: topOngsResult.rows.map((ong) => ({
      id: ong.id,
      name: ong.name || "Sin nombre",
      organization_type: ong.organization_type || null,
      total_reservations: toNumber(ong.total_reservations),
      completed_reservations: toNumber(ong.completed_reservations),
      total_quantity_delivered: roundMetric(ong.total_quantity_delivered),
    })),
    monthly_completed_deliveries: monthlyResult.rows.map((row) => ({
      month: row.month || "Sin fecha",
      completed_deliveries: toNumber(row.completed_deliveries),
      total_quantity_delivered: roundMetric(row.total_quantity_delivered),
    })),
  };
};

// Obtiene el resumen del dashboard segun el rol del usuario autenticado
const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    let summary = {};

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

      const completedCount = reservationsResult.rows[0].reservations_completed;
      const marketImpactReport = await getMarketImpactReport(userId);

      summary = {
        role: userRole,
        products_available: productsResult.rows[0].products_available,
        total_reservations: reservationsResult.rows[0].total_reservations,
        reservations_pending: reservationsResult.rows[0].reservations_pending,
        reservations_confirmed:
          reservationsResult.rows[0].reservations_confirmed,
        reservations_completed: completedCount,
        reservations_cancelled:
          reservationsResult.rows[0].reservations_cancelled,
        unread_notifications: notificationsResult.rows[0].unread_notifications,
        market_impact_report: marketImpactReport,
        ...calculateImpactLevel(completedCount),
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

      const completedCount = reservationsResult.rows[0].reservations_completed;

      summary = {
        role: userRole,
        products_available: productsResult.rows[0].products_available,
        total_reservations: reservationsResult.rows[0].total_reservations,
        reservations_pending: reservationsResult.rows[0].reservations_pending,
        reservations_confirmed:
          reservationsResult.rows[0].reservations_confirmed,
        reservations_completed: completedCount,
        reservations_cancelled:
          reservationsResult.rows[0].reservations_cancelled,
        unread_notifications: notificationsResult.rows[0].unread_notifications,
        ...calculateImpactLevel(completedCount),
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

      const completedCount = reservationsResult.rows[0].reservations_completed;

      summary = {
        role: userRole,
        products_available: productsResult.rows[0].products_available,
        total_reservations: reservationsResult.rows[0].total_reservations,
        reservations_pending: reservationsResult.rows[0].reservations_pending,
        reservations_confirmed:
          reservationsResult.rows[0].reservations_confirmed,
        reservations_completed: completedCount,
        reservations_cancelled:
          reservationsResult.rows[0].reservations_cancelled,
        unread_notifications: notificationsResult.rows[0].unread_notifications,
        ...calculateImpactLevel(completedCount),
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
