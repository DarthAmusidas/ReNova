import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardSummary } from "../services/dashboardService";
import AppSidebar from "../components/AppSidebar";
import NotificationBell from "../components/NotificationBell";

function DashboardIcon({ type }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (type === "products") {
    return (
      <svg {...commonProps}>
        <path d="M21 8.5 12 3 3 8.5" />
        <path d="M21 8.5v7L12 21l-9-5.5v-7" />
        <path d="M12 12 3 8.5" />
        <path d="M12 12l9-3.5" />
        <path d="M12 12v9" />
      </svg>
    );
  }

  if (type === "reservations") {
    return (
      <svg {...commonProps}>
        <rect x="4" y="5" width="16" height="16" rx="3" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M4 10h16" />
        <path d="m9 15 2 2 4-4" />
      </svg>
    );
  }

  if (type === "pending") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (type === "confirmed") {
    return (
      <svg {...commonProps}>
        <path d="M20 6 9 17l-5-5" />
        <path d="M21 12a9 9 0 1 1-6.7-8.7" />
      </svg>
    );
  }

  if (type === "completed") {
    return (
      <svg {...commonProps}>
        <path d="M21 8.5 12 3 3 8.5" />
        <path d="M21 8.5v7L12 21l-9-5.5v-7" />
        <path d="M12 12v9" />
      </svg>
    );
  }

  if (type === "cancelled") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
      </svg>
    );
  }

  if (type === "notifications") {
    return (
      <svg {...commonProps}>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    );
  }

  if (type === "plus") {
    return (
      <svg {...commonProps}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (type === "users") {
    return (
      <svg {...commonProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  return null;
}

function Dashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    products: 0,
    reservations: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    unread: 0,
    impact_level: 1,
    impact_level_label: "Impacto inicial",
    completed_count_for_level: 0,
    next_level_target: 5,
    level_progress_percentage: 0,
    market_impact_report: null,
  });

  const [loading, setLoading] = useState(true);

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const userName = user?.name || "Usuario";
  const userRole = user?.role || "";

  const isSupermarket = userRole === "SUPERMARKET";
  const isAdmin = userRole === "ADMIN";

  const roleLabel = isSupermarket
    ? "Supermercado"
    : isAdmin
    ? "Administrador"
    : "Comedor";

  const getUserInitials = (name = "Usuario") =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

  const pickNumber = (...values) => {
    const value = values.find(
      (item) => item !== undefined && item !== null && item !== ""
    );

    return Number(value || 0);
  };

  const getImpactLevel = (completedCount = 0) => {
    const count = Number(completedCount) || 0;

    if (count >= 75) {
      return {
        level: 5,
        label: "Referente solidario",
        progress: 100,
        text: "Nivel máximo alcanzado",
      };
    }

    if (count >= 35) {
      return {
        level: 4,
        label: "Alto impacto",
        progress: Math.min(100, (count / 75) * 100),
        text: `${count} / 75 reservas confirmadas para Nivel 5`,
      };
    }

    if (count >= 15) {
      return {
        level: 3,
        label: "Impacto consolidado",
        progress: Math.min(100, (count / 35) * 100),
        text: `${count} / 35 reservas confirmadas para Nivel 4`,
      };
    }

    if (count >= 5) {
      return {
        level: 2,
        label: "Impacto en crecimiento",
        progress: Math.min(100, (count / 15) * 100),
        text: `${count} / 15 reservas confirmadas para Nivel 3`,
      };
    }

    return {
      level: 1,
      label: "Impacto inicial",
      progress: Math.min(100, (count / 5) * 100),
      text: `${count} / 5 reservas confirmadas para Nivel 2`,
    };
  };

  const loadDashboard = async () => {
    try {
      const data = await getDashboardSummary();
      const source = data?.summary || data?.dashboard || data?.data || data || {};

      setSummary({
        products: pickNumber(
          source.products,
          source.total_products,
          source.totalProducts,
          source.available_products,
          source.availableProducts,
          source.products_available,
          source.total_available_products
        ),

        reservations: pickNumber(
          source.reservations,
          source.total_reservations,
          source.totalReservations
        ),

        pending: pickNumber(
          source.pending,
          source.reservations_pending,
          source.pending_reservations,
          source.pendingReservations
        ),

        confirmed: pickNumber(
          source.confirmed,
          source.reservations_confirmed,
          source.confirmed_reservations,
          source.confirmedReservations
        ),

        completed: pickNumber(
          source.completed,
          source.reservations_completed,
          source.completed_reservations,
          source.completedReservations
        ),

        cancelled: pickNumber(
          source.cancelled,
          source.canceled,
          source.reservations_cancelled,
          source.cancelled_reservations,
          source.canceled_reservations,
          source.cancelledReservations,
          source.canceledReservations
        ),

        unread: pickNumber(
          source.unread,
          source.unread_notifications,
          source.unreadNotifications,
          source.notifications_unread
        ),

        impact_level: pickNumber(source.impact_level, 1),
        impact_level_label: source.impact_level_label || "Impacto inicial",
        completed_count_for_level: pickNumber(
          source.completed_count_for_level,
          source.reservations_completed,
          source.completed_reservations,
          source.completed
        ),
        next_level_target:
          source.next_level_target === null
            ? null
            : pickNumber(source.next_level_target, 5),
        level_progress_percentage: pickNumber(source.level_progress_percentage),
        market_impact_report: source.market_impact_report || null,
      });
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const getSubtitle = () => {
    if (isAdmin) {
      return "Resumen general de productos, reservas, usuarios y actividad de la plataforma.";
    }

    if (isSupermarket) {
      return "Resumen general de productos, reservas y notificaciones de tu cuenta.";
    }

    return "Resumen general de productos disponibles y reservas realizadas.";
  };

  const impactLevel = getImpactLevel(summary.completed);
  const marketImpactReport = summary.market_impact_report;
  const hasMarketImpactReport = isSupermarket && marketImpactReport;

  const getEffectiveKgRecovered = (report) => {
    const measuredKgRecovered = Number(report?.measured_kg_recovered || 0);
    const co2Avoided = Number(report?.estimated_co2_avoided || 0);
    const co2Factor = Number(report?.co2_factor_per_kg || 0) || 2.5;

    if (measuredKgRecovered > 0) return measuredKgRecovered;
    if (co2Avoided > 0 && co2Factor > 0) return co2Avoided / co2Factor;

    return 0;
  };

  const formatReportNumber = (value, suffix = "") => {
    const number = Number(value || 0);
    const formatted = number.toLocaleString("es-AR", {
      maximumFractionDigits: 2,
    });

    return suffix ? `${formatted} ${suffix}` : formatted;
  };

  const metrics = [
    {
      label: "Productos disponibles",
      value: summary.products,
      helper: "Listos para reservar",
      type: "products",
      tone: "green",
    },
    {
      label: "Total reservas",
      value: summary.reservations,
      helper: "Reservas generadas",
      type: "reservations",
      tone: "green",
    },
    {
      label: "Pendientes",
      value: summary.pending,
      helper: "Requieren seguimiento",
      type: "pending",
      tone: "orange",
    },
    {
      label: "Confirmadas",
      value: summary.confirmed,
      helper: "A la espera de retiro",
      type: "confirmed",
      tone: "green",
    },
    {
      label: "Completadas",
      value: summary.completed,
      helper: "Entregas finalizadas",
      type: "completed",
      tone: "green",
    },
    {
      label: "Canceladas",
      value: summary.cancelled,
      helper: "No concretadas",
      type: "cancelled",
      tone: "danger",
    },
    {
      label: "Notificaciones no leídas",
      value: summary.unread,
      helper: "Pendientes de revisión",
      type: "notifications",
      tone: "warning",
      wide: true,
    },
  ];

  const marketImpactCards = marketImpactReport
    ? [
        {
          label: "Productos publicados",
          value: formatReportNumber(marketImpactReport.total_products_published),
        },
        {
          label: "Reservas recibidas",
          value: formatReportNumber(
            marketImpactReport.total_reservations_received
          ),
        },
        {
          label: "Reservas completadas",
          value: formatReportNumber(marketImpactReport.completed_reservations),
        },
        {
          label: "Reservas pendientes",
          value: formatReportNumber(marketImpactReport.pending_reservations),
        },
        {
          label: "Reservas canceladas",
          value: formatReportNumber(marketImpactReport.cancelled_reservations),
        },
        {
          label: "ONG beneficiadas",
          value: formatReportNumber(marketImpactReport.distinct_ongs_helped),
        },
        {
          label: "Cantidad entregada",
          value: formatReportNumber(marketImpactReport.total_quantity_delivered),
        },
        {
          label: "Kg recuperados",
          value: formatReportNumber(
            getEffectiveKgRecovered(marketImpactReport),
            "kg"
          ),
        },
        {
          label: "CO₂ evitado estimado",
          value: formatReportNumber(
            marketImpactReport.estimated_co2_avoided,
            "kg"
          ),
        },
        {
          label: "Tasa de aprovechamiento",
          value: formatReportNumber(marketImpactReport.utilization_rate, "%"),
        },
      ]
    : [];

  return (
    <div className="renova-app-shell">
      <AppSidebar
        active="dashboard"
        user={user}
        isAdmin={isAdmin}
        navigate={navigate}
        onLogout={handleLogout}
      />

      <main className="renova-dashboard-main">
        <header className="renova-dashboard-header">
          <div>
            <span className="renova-section-badge">
              {isAdmin ? "Administración" : "Panel de gestión"}
            </span>

            <h1>
              Hola, <span>{userName}</span>
            </h1>

            <p>{getSubtitle()}</p>
          </div>

          <div className="renova-header-actions">
            <div className="renova-user-summary renova-dashboard-user-card">
              <div className="renova-user-avatar">
                {getUserInitials(userName)}
              </div>

              <div className="renova-user-meta">
                <span>Usuario</span>
                <strong>{userName}</strong>
                <small>{roleLabel}</small>
              </div>
            </div>

            <NotificationBell />
          </div>
        </header>

        {loading ? (
          <section className="renova-dashboard-panel">
            <h2>Cargando información...</h2>
            <p>Estamos consultando los indicadores principales del dashboard.</p>
          </section>
        ) : (
          <>
            {isSupermarket && (
              <section className="renova-dashboard-level-panel">
                <div>
                  <span>Nivel de impacto</span>
                  <h2>
                    Nivel {impactLevel.level} · {impactLevel.label}
                  </h2>
                  <p>{impactLevel.text}</p>
                </div>

                <div className="renova-dashboard-progress-track">
                  <div
                    className="renova-dashboard-progress-fill"
                    style={{ width: `${impactLevel.progress}%` }}
                  />
                </div>
              </section>
            )}

            <section className="renova-dashboard-metrics">
              {metrics.map((metric) => (
                <article
                  key={metric.label}
                  className={
                    metric.wide
                      ? `renova-dashboard-metric-card renova-dashboard-metric-wide ${metric.tone}`
                      : `renova-dashboard-metric-card ${metric.tone}`
                  }
                >
                  <div className="renova-dashboard-metric-icon">
                    <DashboardIcon type={metric.type} />
                  </div>

                  <div>
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                    <p>{metric.helper}</p>
                  </div>
                </article>
              ))}
            </section>

            {hasMarketImpactReport && (
              <section className="renova-dashboard-panel">
                <div className="renova-dashboard-panel-header">
                  <div>
                    <h2>Reporte de impacto</h2>
                    <p>
                      Indicadores principales a partir de tus productos y
                      reservas completadas.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="renova-dashboard-primary-action"
                    onClick={() => navigate("/impact")}
                  >
                    Ver reporte completo
                  </button>
                </div>

                <div className="renova-dashboard-impact-grid">
                  {marketImpactCards.map((item) => (
                    <article key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>

                <p className="renova-dashboard-note">
                  La tasa de aprovechamiento mide el porcentaje de reservas
                  recibidas que finalizaron como entregas completadas.
                </p>
              </section>
            )}

            <section className="renova-dashboard-panel">
              <div className="renova-dashboard-panel-header">
                <div>
                  <h2>
                    {isAdmin ? "Accesos de administración" : "Accesos rápidos"}
                  </h2>

                  <p>
                    {isAdmin
                      ? "Desde este panel podés consultar la información general de la plataforma."
                      : "Continuá gestionando el flujo principal de ReNova desde acá."}
                  </p>
                </div>
              </div>

              <div className="renova-dashboard-actions-grid">
                <button
                  type="button"
                  className="renova-dashboard-action-card"
                  onClick={() => navigate("/products")}
                >
                  <span>
                    <DashboardIcon type="products" />
                  </span>

                  <strong>Ver productos</strong>
                  <small>
                    {isSupermarket
                      ? "Administrar productos publicados"
                      : "Explorar productos disponibles"}
                  </small>
                </button>

                <button
                  type="button"
                  className="renova-dashboard-action-card"
                  onClick={() => navigate("/reservations")}
                >
                  <span>
                    <DashboardIcon type="reservations" />
                  </span>

                  <strong>Ver reservas</strong>
                  <small>Consultar y gestionar reservas</small>
                </button>

                {isSupermarket && (
                  <button
                    type="button"
                    className="renova-dashboard-action-card"
                    onClick={() => navigate("/products/create")}
                  >
                    <span>
                      <DashboardIcon type="plus" />
                    </span>

                    <strong>Cargar producto</strong>
                    <small>Publicar un nuevo producto disponible</small>
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    className="renova-dashboard-action-card"
                    onClick={() => navigate("/users")}
                  >
                    <span>
                      <DashboardIcon type="users" />
                    </span>

                    <strong>Ver usuarios</strong>
                    <small>Consultar usuarios registrados</small>
                  </button>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
