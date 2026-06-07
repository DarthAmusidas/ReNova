// Controlador de dashboard / resumen general
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CO2_FACTOR_PER_KG = 2.5;

const LEVELS = [
  { level: 1, min: 0, next: 5, label: "Impacto inicial" },
  { level: 2, min: 5, next: 15, label: "Impacto en crecimiento" },
  { level: 3, min: 15, next: 35, label: "Impacto consolidado" },
  { level: 4, min: 35, next: 75, label: "Alto impacto" },
  { level: 5, min: 75, next: null, label: "Referente solidario" },
];

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const roundMetric = (value, decimals = 2) => {
  const number = toNumber(value);
  return Number(number.toFixed(decimals));
};

const normalizeRole = (role) => String(role || "").trim().toUpperCase();

const normalizeUnit = (unit) => {
  const value = String(unit || "")
    .trim()
    .toLowerCase();

  if (!value) return "sin unidad informada";

  if (["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(value)) {
    return "kilos";
  }

  if (["unidad", "unidades", "u", "ud", "uds"].includes(value)) {
    return "unidades";
  }

  if (["caja", "cajas"].includes(value)) {
    return "cajas";
  }

  if (["paquete", "paquetes"].includes(value)) {
    return "paquetes";
  }

  if (["bolsa", "bolsas"].includes(value)) {
    return "bolsas";
  }

  if (["litro", "litros", "l"].includes(value)) {
    return "litros";
  }

  return value;
};

const isWeightUnit = (unit) => normalizeUnit(unit) === "kilos";

const calculateImpactLevel = (completedCount) => {
  const completed = toNumber(completedCount);

  const currentLevel =
    [...LEVELS].reverse().find((item) => completed >= item.min) || LEVELS[0];

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
    impact_level_text: nextTarget
      ? `${completed} / ${nextTarget} reservas confirmadas para Nivel ${
          currentLevel.level + 1
        }`
      : "Nivel máximo alcanzado",
  };
};

const getUserId = (req) => {
  return req.user?.id || req.user?.userId || req.user?.user_id || null;
};

const getUserInfo = async (userId) => {
  if (!userId) return null;

  const result = await pool.query(
    `SELECT id, name, email, role, organization_type
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
};

const getUnreadNotificationsCount = async (userId) => {
  if (!userId) return 0;

  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS unread_notifications
       FROM notifications
       WHERE user_id = $1
         AND COALESCE(is_read, false) = false`,
      [userId]
    );

    return toNumber(result.rows[0]?.unread_notifications);
  } catch (error) {
    console.error("Error getting unread notifications count:", error.message);
    return 0;
  }
};

const getReservationStats = async ({ role, userId }) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SUPERMARKET") {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS total_reservations,
         COUNT(*) FILTER (WHERE r.status = 'PENDING')::int AS pending_reservations,
         COUNT(*) FILTER (WHERE r.status = 'CONFIRMED')::int AS confirmed_reservations,
         COUNT(*) FILTER (WHERE r.status = 'COMPLETED')::int AS completed_reservations,
         COUNT(*) FILTER (WHERE r.status = 'CANCELLED')::int AS cancelled_reservations
       FROM reservations r
       INNER JOIN products p ON p.id = r.product_id
       WHERE p.supermarket_id = $1`,
      [userId]
    );

    return result.rows[0] || {};
  }

  if (normalizedRole === "ONG") {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS total_reservations,
         COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_reservations,
         COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS confirmed_reservations,
         COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed_reservations,
         COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled_reservations
       FROM reservations
       WHERE ong_id = $1`,
      [userId]
    );

    return result.rows[0] || {};
  }

  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS total_reservations,
       COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_reservations,
       COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS confirmed_reservations,
       COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed_reservations,
       COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled_reservations
     FROM reservations`
  );

  return result.rows[0] || {};
};

const getProductsAvailableCount = async ({ role, userId }) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SUPERMARKET") {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS products_available
       FROM products
       WHERE supermarket_id = $1
         AND COALESCE(quantity, 0) > 0`,
      [userId]
    );

    return toNumber(result.rows[0]?.products_available);
  }

  const result = await pool.query(
    `SELECT COUNT(*)::int AS products_available
     FROM products
     WHERE COALESCE(quantity, 0) > 0`
  );

  return toNumber(result.rows[0]?.products_available);
};

const getImpactScopeClause = (supermarketId) => {
  return supermarketId ? "WHERE p.supermarket_id = $1" : "";
};

const getImpactParams = (supermarketId) => {
  return supermarketId ? [supermarketId] : [];
};

const getImpactReport = async (supermarketId = null) => {
  const scopeClause = getImpactScopeClause(supermarketId);
  const params = getImpactParams(supermarketId);

  const productsResult = await pool.query(
    `SELECT COUNT(*)::int AS total_products_published
     FROM products
     ${supermarketId ? "WHERE supermarket_id = $1" : ""}`,
    params
  );

  const reservationsResult = await pool.query(
    `SELECT
       COUNT(*)::int AS total_reservations_received,
       COUNT(*) FILTER (WHERE r.status = 'COMPLETED')::int AS completed_reservations,
       COUNT(*) FILTER (WHERE r.status = 'PENDING')::int AS pending_reservations,
       COUNT(*) FILTER (WHERE r.status = 'CANCELLED')::int AS cancelled_reservations,
       COUNT(DISTINCT r.ong_id) FILTER (WHERE r.status = 'COMPLETED')::int AS distinct_ongs_helped
     FROM reservations r
     INNER JOIN products p ON p.id = r.product_id
     ${scopeClause}`,
    params
  );

  const completedDeliveriesResult = await pool.query(
    `SELECT
       COALESCE(r.quantity_reserved, 0)::numeric AS quantity_reserved,
       p.unit AS unit
     FROM reservations r
     INNER JOIN products p ON p.id = r.product_id
     ${scopeClause}
     ${scopeClause ? "AND" : "WHERE"} r.status = 'COMPLETED'`,
    params
  );

  const deliveredByUnitMap = new Map();
  let totalQuantityDelivered = 0;
  let measuredKgRecovered = 0;

  completedDeliveriesResult.rows.forEach((row) => {
    const quantity = toNumber(row.quantity_reserved);
    const unit = normalizeUnit(row.unit);

    totalQuantityDelivered += quantity;

    deliveredByUnitMap.set(
      unit,
      roundMetric((deliveredByUnitMap.get(unit) || 0) + quantity)
    );

    if (isWeightUnit(unit)) {
      measuredKgRecovered += quantity;
    }
  });

  let deliveredByUnit = Array.from(deliveredByUnitMap.entries())
    .map(([unit, quantity]) => ({
      unit,
      quantity: roundMetric(quantity),
    }))
    .sort((a, b) => b.quantity - a.quantity || a.unit.localeCompare(b.unit));

  if (totalQuantityDelivered > 0 && deliveredByUnit.length === 0) {
    deliveredByUnit = [
      {
        unit: "sin unidad informada",
        quantity: roundMetric(totalQuantityDelivered),
      },
    ];
  }

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
     ${scopeClause}
     GROUP BY u.id, u.name, u.organization_type
     ORDER BY completed_reservations DESC, total_reservations DESC, u.name ASC
     LIMIT 5`,
    params
  );

  const monthlyResult = await pool.query(
    `SELECT
       TO_CHAR(DATE_TRUNC('month', r.reserved_at), 'YYYY-MM') AS month,
       COUNT(*)::int AS completed_deliveries,
       COALESCE(SUM(r.quantity_reserved), 0)::numeric AS total_quantity_delivered
     FROM reservations r
     INNER JOIN products p ON p.id = r.product_id
     ${scopeClause}
     ${scopeClause ? "AND" : "WHERE"} r.status = 'COMPLETED'
       AND r.reserved_at IS NOT NULL
     GROUP BY DATE_TRUNC('month', r.reserved_at)
     ORDER BY DATE_TRUNC('month', r.reserved_at) ASC`,
    params
  );

  const stats = reservationsResult.rows[0] || {};
  const totalReservations = toNumber(stats.total_reservations_received);
  const completedReservations = toNumber(stats.completed_reservations);

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
    delivered_by_unit: deliveredByUnit,

    measured_kg_recovered: roundMetric(measuredKgRecovered),
    co2_factor_per_kg: CO2_FACTOR_PER_KG,
    estimated_co2_avoided: roundMetric(
      measuredKgRecovered * CO2_FACTOR_PER_KG
    ),

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

const getDashboard = async (req, res) => {
  try {
    const userId = getUserId(req);
    const authRole = req.user?.role;

    const user = await getUserInfo(userId);
    const role = normalizeRole(user?.role || authRole);

    const reservationStats = await getReservationStats({ role, userId });
    const productsAvailable = await getProductsAvailableCount({ role, userId });
    const unreadNotifications = await getUnreadNotificationsCount(userId);

    const completedReservations = toNumber(
      reservationStats.completed_reservations
    );

    const impactLevel = calculateImpactLevel(completedReservations);

    let impactReport = null;

    if (role === "SUPERMARKET") {
      impactReport = await getImpactReport(userId);
    }

    if (role === "ADMIN") {
      impactReport = await getImpactReport(null);
    }

    const payload = {
      success: true,

      user: user || {
        id: userId,
        role,
      },

      role,

      products_available: productsAvailable,
      total_reservations: toNumber(reservationStats.total_reservations),
      pending_reservations: toNumber(reservationStats.pending_reservations),
      confirmed_reservations: toNumber(
        reservationStats.confirmed_reservations
      ),
      completed_reservations: completedReservations,
      cancelled_reservations: toNumber(
        reservationStats.cancelled_reservations
      ),
      unread_notifications: unreadNotifications,

      ...impactLevel,

      impact_report: impactReport,
      market_impact_report: impactReport,
    };

    return res.json(payload);
  } catch (error) {
    console.error("Error getting dashboard:", error);
    return res.status(500).json({
      success: false,
      message: "Error obteniendo dashboard",
      error: error.message,
    });
  }
};

const getImpactReportController = async (req, res) => {
  try {
    const userId = getUserId(req);
    const authRole = req.user?.role;

    const user = await getUserInfo(userId);
    const role = normalizeRole(user?.role || authRole);

    let report = null;

    if (role === "SUPERMARKET") {
      report = await getImpactReport(userId);
    } else if (role === "ADMIN") {
      report = await getImpactReport(null);
    } else {
      report = null;
    }

    return res.json({
      success: true,
      user,
      role,
      impact_report: report,
      market_impact_report: report,
    });
  } catch (error) {
    console.error("Error getting impact report:", error);
    return res.status(500).json({
      success: false,
      message: "Error obteniendo reporte de impacto",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboard,
  getDashboardSummary: getDashboard,
  getDashboardData: getDashboard,
  getImpactReport: getImpactReportController,
  getImpactReportController,
};
