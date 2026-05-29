import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardSummary } from "../services/dashboardService";
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
  });

  const [loading, setLoading] = useState(true);

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const userName = user?.name || "Usuario";
  const userRole = user?.role || "";

  const isSupermarket = userRole === "SUPERMARKET";
  const roleLabel = isSupermarket ? "Supermercado" : "ONG";
  const userIcon = isSupermarket ? "🛒" : "🤝";

  const pickNumber = (...values) => {
    const value = values.find(
      (item) => item !== undefined && item !== null && item !== ""
    );

    return Number(value || 0);
  };

  const loadDashboard = async () => {
    try {
      const data = await getDashboardSummary();

      console.log("Dashboard API response:", data);

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
          source.pending_reservations,
          source.pendingReservations
        ),

        confirmed: pickNumber(
          source.confirmed,
          source.confirmed_reservations,
          source.confirmedReservations
        ),

        completed: pickNumber(
          source.completed,
          source.completed_reservations,
          source.completedReservations
        ),

        cancelled: pickNumber(
          source.cancelled,
          source.canceled,
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
      icon: "📦",
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
      icon: "🏁",
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

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.logoBox}>
          <div style={styles.logoIcon}>🌱</div>
          <h2 style={styles.logoText}>ReNova</h2>
        </div>

        <nav style={styles.nav}>
          <button
            type="button"
            style={styles.navButtonActive}
            onClick={() => navigate("/dashboard")}
          >
            <span>📊</span>
            Dashboard
          </button>

          <button
            type="button"
            style={styles.navButton}
            onClick={() => navigate("/products")}
          >
            <span>🥬</span>
            Productos
          </button>

          <button
            type="button"
            style={styles.navButton}
            onClick={() => navigate("/reservations")}
          >
            <span>📋</span>
            Reservas
          </button>
        </nav>

        <button type="button" style={styles.logoutButton} onClick={handleLogout}>
          Cerrar sesión
        </button>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <span style={styles.badge}>Panel de gestión</span>

            <h1 style={styles.title}>
              Hola, <span style={styles.titleHighlight}>{userName}</span>
            </h1>

            <p style={styles.subtitle}>
              {isSupermarket
                ? "Resumen general de productos, reservas y notificaciones de tu cuenta."
                : "Resumen general de productos disponibles y reservas realizadas."}
            </p>
          </div>

          <div style={styles.userArea}>
            <div style={styles.userCard}>
              <div style={styles.userAvatar}>{userIcon}</div>

              <div style={styles.userInfo}>
                <span style={styles.sessionText}>Sesión activa</span>
                <strong style={styles.userName}>{userName}</strong>
                <span style={styles.rolePill}>{roleLabel}</span>
              </div>
            </div>

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

            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>
                {isSupermarket
                  ? "Accesos rápidos"
                  : "Búsqueda y reserva de productos"}
              </h2>

              <p style={styles.panelText}>
                {isSupermarket
                  ? "Continuá gestionando el flujo principal de ReNova desde acá."
                  : "Desde esta sección podés consultar productos disponibles, realizar reservas y hacer seguimiento de tus solicitudes."}
              </p>

              <div style={styles.quickActionsGrid}>
                <button
                  type="button"
                  style={styles.quickActionCard}
                  onClick={() => navigate("/products")}
                >
                  <span style={styles.quickActionIcon}>🥬</span>
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
                    <span style={styles.quickActionIcon}>➕</span>
                    <strong>Cargar producto</strong>
                    <small>Publicar un nuevo producto disponible</small>
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