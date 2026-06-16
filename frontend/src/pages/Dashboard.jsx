import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardSummary } from "../services/dashboardService";
import AppSidebar from "../components/AppSidebar";
import HeaderUserCard from "../components/HeaderUserCard";
import NotificationBell from "../components/NotificationBell";

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
  const isOng = userRole === "ONG";
  const isAdmin = userRole === "ADMIN";

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
        level_progress_percentage: pickNumber(
          source.level_progress_percentage
        ),
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

  const metrics = [
    {
      label: "Productos disponibles",
      value: summary.products,
      icon: "🥦",
    },
    {
      label: "Total reservas",
      value: summary.reservations,
      icon: "📋",
    },
    {
      label: "Pendientes",
      value: summary.pending,
      icon: "⏳",
    },
    {
      label: "Confirmadas",
      value: summary.confirmed,
      icon: "✅",
    },
    {
      label: "Completadas",
      value: summary.completed,
      icon: "📦",
    },
    {
      label: "Canceladas",
      value: summary.cancelled,
      icon: "❌",
    },
    {
      label: "Notificaciones no leídas",
      value: summary.unread,
      icon: "🔔",
      wide: true,
    },
  ];

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

  const marketImpactCards = marketImpactReport
    ? [
        {
          label: "Productos publicados",
          value: formatReportNumber(
            marketImpactReport.total_products_published
          ),
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
          value: formatReportNumber(
            marketImpactReport.total_quantity_delivered
          ),
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

  const monthlyDeliveries = Array.isArray(
    marketImpactReport?.monthly_completed_deliveries
  )
    ? marketImpactReport.monthly_completed_deliveries
    : [];

  const maxMonthlyDeliveries = Math.max(
    1,
    ...monthlyDeliveries.map((item) => Number(item.completed_deliveries || 0))
  );

  const topOngs = Array.isArray(marketImpactReport?.top_ongs)
    ? marketImpactReport.top_ongs
    : [];

  return (
    <div style={styles.layout}>
      <AppSidebar
        active="dashboard"
        user={user}
        isAdmin={isAdmin}
        navigate={navigate}
        onLogout={handleLogout}
      />

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <span style={styles.badge}>
              {isAdmin ? "Administración" : "Panel de gestión"}
            </span>

            <h1 style={styles.title}>
              Hola, <span style={styles.titleHighlight}>{userName}</span>
            </h1>

            <p style={styles.subtitle}>{getSubtitle()}</p>
          </div>

          <div style={styles.userArea}>
            <HeaderUserCard user={user} />

            <div style={styles.bellWrapper}>
              <NotificationBell />
            </div>
          </div>
        </header>

        {loading ? (
          <section style={styles.panel}>
            <p style={styles.panelText}>Cargando información del dashboard...</p>
          </section>
        ) : (
          <>
            {!isOng && (
              <section style={styles.levelPanel}>
                <div>
                  <span style={styles.levelEyebrow}>Nivel de impacto</span>
                  <h2 style={styles.levelTitle}>
                    Nivel {impactLevel.level} - {impactLevel.label}
                  </h2>
                  <p style={styles.levelText}>{impactLevel.text}</p>
                </div>

                <div style={styles.progressTrack}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${impactLevel.progress}%`,
                    }}
                  />
                </div>
              </section>
            )}

            <section style={styles.metricsGrid}>
              {metrics.map((metric) => (
                <article
                  key={metric.label}
                  style={metric.wide ? styles.metricCardWide : styles.metricCard}
                >
                  <div style={styles.metricIcon}>{metric.icon}</div>
                  <p style={styles.metricLabel}>{metric.label}</p>
                  <strong style={styles.metricValue}>{metric.value}</strong>
                </article>
              ))}
            </section>

            {hasMarketImpactReport && (
              <section style={styles.impactReportPanel}>
                <div style={styles.impactReportHeader}>
                  <div>
                    <h2 style={styles.panelTitle}>Reporte de impacto</h2>
                    <p style={styles.panelText}>
                      Indicadores principales a partir de tus productos y
                      reservas completadas.
                    </p>
                  </div>

                  <button
                    type="button"
                    style={styles.printReportButton}
                    onClick={() => navigate("/impact")}
                  >
                    Ver reporte completo
                  </button>
                </div>

                <div style={styles.impactReportGrid}>
                  {marketImpactCards.map((item) => (
                    <article key={item.label} style={styles.impactReportCard}>
                      <span style={styles.impactReportLabel}>{item.label}</span>
                      <strong style={styles.impactReportValue}>
                        {item.value}
                      </strong>
                    </article>
                  ))}
                </div>

                <p style={styles.panelText}>
                  El reporte formal, la metodología y las cantidades agrupadas
                  por unidad ahora están disponibles en la sección Impacto.
                </p>
                <p style={styles.panelText}>
                  Tasa de aprovechamiento: porcentaje de reservas recibidas que
                  finalizaron como entregas completadas.
                </p>
              </section>
            )}

            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>
                {isAdmin ? "Accesos de administración" : "Accesos rápidos"}
              </h2>

              <p style={styles.panelText}>
                {isAdmin
                  ? "Desde este panel podés consultar la información general de la plataforma."
                  : "Continuá gestionando el flujo principal de ReNova desde acá."}
              </p>

              <div style={styles.quickActionsGrid}>
                <button
                  type="button"
                  style={styles.quickActionCard}
                  onClick={() => navigate("/products")}
                >
                  <span style={styles.quickActionIcon}>🥦</span>
                  <strong>Ver productos</strong>
                  <small>
                    {isSupermarket
                      ? "Administrar productos publicados"
                      : "Explorar productos disponibles"}
                  </small>
                </button>

                <button
                  type="button"
                  style={styles.quickActionCard}
                  onClick={() => navigate("/reservations")}
                >
                  <span style={styles.quickActionIcon}>📋</span>
                  <strong>Ver reservas</strong>
                  <small>Consultar y gestionar reservas</small>
                </button>

                {isSupermarket && (
                  <button
                    type="button"
                    style={styles.quickActionCard}
                    onClick={() => navigate("/products/create")}
                  >
                    <span style={styles.quickActionIcon}>+</span>
                    <strong>Cargar producto</strong>
                    <small>Publicar un nuevo producto disponible</small>
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    style={styles.quickActionCard}
                    onClick={() => navigate("/users")}
                  >
                    <span style={styles.quickActionIcon}>👥</span>
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

const styles = {
  layout: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "270px 1fr",
    background: "#f6f9f2",
    color: "#102018",
  },

  sidebar: {
    background: "#102018",
    color: "#ffffff",
    padding: "34px 22px 24px",
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
  },

  logoBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "42px",
  },

  logoIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "16px",
    background: "#e8f4df",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
  },

  logoText: {
    margin: 0,
    fontSize: "1.45rem",
    fontWeight: 900,
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  navButton: {
    border: "none",
    borderRadius: "16px",
    background: "transparent",
    color: "rgba(255,255,255,0.8)",
    padding: "15px 18px",
    textAlign: "left",
    fontWeight: 800,
    fontSize: "0.98rem",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  navButtonActive: {
    border: "none",
    borderRadius: "16px",
    background: "rgba(126, 191, 26, 0.24)",
    color: "#ffffff",
    padding: "15px 18px",
    textAlign: "left",
    fontWeight: 900,
    fontSize: "0.98rem",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  logoutButton: {
    marginTop: "auto",
    width: "100%",
    minHeight: "52px",
    border: "none",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.13)",
    color: "#ffffff",
    fontWeight: 900,
    fontSize: "0.95rem",
  },

  main: {
    padding: "42px 48px",
    background:
      "radial-gradient(circle at 95% 0%, rgba(126,191,26,0.08), transparent 28%), #f6f9f2",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "32px",
    marginBottom: "34px",
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "10px 18px",
    borderRadius: "999px",
    background: "#e8f4df",
    color: "#21801f",
    fontWeight: 900,
    fontSize: "0.95rem",
  },

  title: {
    margin: "26px 0 10px",
    fontSize: "2.45rem",
    lineHeight: 1.1,
    letterSpacing: "-0.8px",
    color: "#102018",
  },

  titleHighlight: {
    color: "#2f9728",
  },

  subtitle: {
    margin: 0,
    color: "#647066",
    fontSize: "1.05rem",
    lineHeight: 1.6,
  },

  userArea: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    paddingTop: "30px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  userCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "#ffffff",
    border: "1px solid #e1eadc",
    borderRadius: "26px",
    padding: "16px 20px",
    minWidth: "290px",
    boxShadow: "0 18px 45px rgba(31,77,28,0.08)",
  },

  userAvatar: {
    width: "56px",
    height: "56px",
    borderRadius: "20px",
    background: "#e8f4df",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "27px",
    flexShrink: 0,
  },

  userInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: 0,
  },

  sessionText: {
    color: "#7a867c",
    fontSize: "0.78rem",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },

  userName: {
    color: "#102018",
    fontSize: "1.08rem",
    fontWeight: 950,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  rolePill: {
    width: "fit-content",
    marginTop: "3px",
    padding: "5px 11px",
    borderRadius: "999px",
    background: "#f0f7ea",
    color: "#21801f",
    fontSize: "0.76rem",
    fontWeight: 900,
  },

  bellWrapper: {
    transform: "scale(1.05)",
  },

  topLogoutButton: {
    minHeight: "46px",
    border: "1px solid #d6e4d0",
    borderRadius: "15px",
    background: "#ffffff",
    color: "#223025",
    padding: "0 18px",
    fontWeight: 900,
    fontSize: "0.92rem",
    boxShadow: "0 14px 34px rgba(31,77,28,0.06)",
    whiteSpace: "nowrap",
  },

  levelPanel: {
    background: "#ffffff",
    border: "1px solid #e1eadc",
    borderRadius: "30px",
    padding: "28px",
    boxShadow: "0 18px 45px rgba(31,77,28,0.07)",
    marginBottom: "26px",
  },

  levelEyebrow: {
    display: "block",
    color: "#21801f",
    fontSize: "0.78rem",
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    marginBottom: "8px",
  },

  levelTitle: {
    margin: "0 0 8px",
    color: "#102018",
    fontSize: "1.55rem",
    fontWeight: 950,
  },

  levelText: {
    margin: "0 0 18px",
    color: "#536057",
    fontSize: "1rem",
    fontWeight: 800,
  },

  progressTrack: {
    width: "100%",
    height: "12px",
    borderRadius: "999px",
    background: "#e7eee2",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: "999px",
    background: "#2f9728",
    transition: "width 0.25s ease",
  },

  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(190px, 1fr))",
    gap: "22px",
    marginBottom: "32px",
  },

  metricCard: {
    minHeight: "190px",
    background: "linear-gradient(135deg, #38a42f 0%, #248920 100%)",
    border: "none",
    borderRadius: "30px",
    padding: "30px",
    boxShadow: "0 18px 45px rgba(47,151,40,0.18)",
    color: "#ffffff",
  },

  metricCardWide: {
    minHeight: "190px",
    background: "linear-gradient(135deg, #38a42f 0%, #248920 100%)",
    border: "none",
    borderRadius: "30px",
    padding: "30px",
    boxShadow: "0 18px 45px rgba(47,151,40,0.18)",
    color: "#ffffff",
    gridColumn: "span 2",
  },

  metricIcon: {
    width: "58px",
    height: "58px",
    borderRadius: "20px",
    background: "rgba(255,255,255,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    marginBottom: "22px",
  },

  metricLabel: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1rem",
    fontWeight: 850,
  },

  metricValue: {
    display: "block",
    marginTop: "16px",
    color: "#ffffff",
    fontSize: "2.45rem",
    lineHeight: 1,
    fontWeight: 950,
  },

  panel: {
    background: "#ffffff",
    border: "1px solid #e1eadc",
    borderRadius: "32px",
    padding: "34px",
    boxShadow: "0 18px 45px rgba(31,77,28,0.07)",
  },

  panelTitle: {
    margin: "0 0 10px",
    color: "#102018",
    fontSize: "1.65rem",
    letterSpacing: "-0.4px",
  },

  panelText: {
    margin: 0,
    color: "#536057",
    fontSize: "1.05rem",
    lineHeight: 1.7,
    maxWidth: "960px",
  },

  impactReportPanel: {
    background: "#ffffff",
    border: "1px solid #e1eadc",
    borderRadius: "32px",
    padding: "34px",
    boxShadow: "0 18px 45px rgba(31,77,28,0.07)",
    marginBottom: "32px",
  },

  impactReportHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "18px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },

  printReportButton: {
    border: "none",
    borderRadius: "15px",
    background: "#2f9728",
    color: "#ffffff",
    padding: "13px 19px",
    fontWeight: 900,
    fontSize: "0.95rem",
    boxShadow: "0 14px 26px rgba(47,151,40,0.18)",
  },

  impactReportGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
    marginBottom: "24px",
  },

  impactReportCard: {
    background: "#f7faf4",
    border: "1px solid #e6efdf",
    borderRadius: "18px",
    padding: "16px",
  },

  impactReportLabel: {
    display: "block",
    color: "#617064",
    fontSize: "0.82rem",
    fontWeight: 900,
    marginBottom: "10px",
  },

  impactReportValue: {
    display: "block",
    color: "#102018",
    fontSize: "1.35rem",
    lineHeight: 1.15,
    fontWeight: 950,
  },

  reportColumns: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(280px, 1fr))",
    gap: "18px",
  },

  reportSubpanel: {
    background: "#ffffff",
    border: "1px solid #e1eadc",
    borderRadius: "24px",
    padding: "22px",
  },

  reportSubtitle: {
    margin: "0 0 16px",
    color: "#102018",
    fontSize: "1.15rem",
    fontWeight: 950,
  },

  topOngList: {
    display: "grid",
    gap: "10px",
  },

  topOngItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    padding: "13px 0",
    borderBottom: "1px solid #edf2ea",
  },

  monthlyBars: {
    display: "grid",
    gap: "12px",
  },

  monthlyBarRow: {
    display: "grid",
    gridTemplateColumns: "70px 1fr 42px",
    alignItems: "center",
    gap: "10px",
  },

  monthlyBarLabel: {
    color: "#536057",
    fontSize: "0.86rem",
    fontWeight: 900,
  },

  monthlyBarTrack: {
    height: "12px",
    background: "#e7eee2",
    borderRadius: "999px",
    overflow: "hidden",
  },

  monthlyBarFill: {
    height: "100%",
    minWidth: "4px",
    background: "#2f9728",
    borderRadius: "999px",
  },

  monthlyBarValue: {
    color: "#102018",
    fontSize: "0.9rem",
    textAlign: "right",
  },

  quickActionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(220px, 1fr))",
    gap: "18px",
    marginTop: "28px",
  },

  quickActionCard: {
    border: "1px solid #e1eadc",
    borderRadius: "24px",
    background: "#ffffff",
    padding: "22px",
    textAlign: "left",
    boxShadow: "0 14px 34px rgba(31,77,28,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  quickActionIcon: {
    width: "52px",
    height: "52px",
    borderRadius: "18px",
    background: "#e8f4df",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    marginBottom: "8px",
  },
};

export default Dashboard;




