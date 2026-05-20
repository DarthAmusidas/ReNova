import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardSummary } from "../services/dashboardService";
import NotificationBell from "../components/NotificationBell";

function Dashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await getDashboardSummary();
        setSummary(data.summary);
      } catch (err) {
        setError(err.response?.data?.error || "Error al cargar dashboard");
      }
    };

    loadDashboard();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const isSupermarket = user?.role === "SUPERMARKET";
  const isOng = user?.role === "ONG";

  return (
    <div className="dashboard-page-modern">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">🌱</div>
          <h2>ReNova</h2>
        </div>

       <nav className="dashboard-menu">
  <button className="active">Dashboard</button>
  <button onClick={() => navigate("/products")}>Productos</button>
  <button onClick={() => navigate("/reservations")}>Reservas</button>
</nav>

        <button className="sidebar-logout" onClick={logout}>
          Cerrar sesión
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="green-badge dashboard-badge">
              Panel de gestión
            </span>

            <h1>
              Hola, <span>{user?.name}</span>
            </h1>

            <p>
              Resumen general de productos, reservas y notificaciones de tu
              cuenta.
            </p>
          </div>

        <div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "18px",
    minWidth: "fit-content",
  }}
>
  <div className="dashboard-user-card">
    <div className="user-avatar">
      {isSupermarket ? "🛒" : "🤝"}
    </div>

    <div>
      <strong>{user?.name}</strong>
      <p>{user?.role}</p>
    </div>
  </div>

  <NotificationBell />
</div>
        </header>

        {error && <div className="error-message-modern">{error}</div>}

        {summary && (
          <>
            <section className="dashboard-metrics-modern">
              <div className="metric-card-modern primary">
                <div className="metric-icon-modern">📦</div>
                <p>Productos disponibles</p>
                <strong>{summary.products_available}</strong>
              </div>

              <div className="metric-card-modern primary">
                <div className="metric-icon-modern">📋</div>
                <p>Total reservas</p>
                <strong>{summary.total_reservations}</strong>
              </div>

              <div className="metric-card-modern primary">
                <div className="metric-icon-modern">⏳</div>
                <p>Pendientes</p>
                <strong>{summary.reservations_pending}</strong>
              </div>

              <div className="metric-card-modern primary">
                <div className="metric-icon-modern">✅</div>
                <p>Confirmadas</p>
                <strong>{summary.reservations_confirmed}</strong>
              </div>

              <div className="metric-card-modern primary">
                <div className="metric-icon-modern">🏁</div>
                <p>Completadas</p>
                <strong>{summary.reservations_completed}</strong>
              </div>

              <div className="metric-card-modern primary">
                <div className="metric-icon-modern">❌</div>
                <p>Canceladas</p>
                <strong>{summary.reservations_cancelled}</strong>
              </div>

              <div className="metric-card-modern primary notification">
                <div className="metric-icon-modern">🔔</div>
                <p>Notificaciones no leídas</p>
                <strong>{summary.unread_notifications}</strong>
              </div>
            </section>

            <section className="dashboard-actions-section">
              <div className="dashboard-section-header">
                <h2>Accesos rápidos</h2>
                <p>
                  Continuá gestionando el flujo principal de ReNova desde acá.
                </p>
              </div>

              <div className="quick-actions-grid">
                {isSupermarket && (
                  <>
                    <div className="quick-action-card">
                      <div className="quick-action-icon">➕</div>
                      <h3>Cargar producto</h3>
                      <p>
                        Publicá productos disponibles para que puedan ser
                        reservados por una ONG.
                      </p>
                      <button onClick={() => navigate("/products/create")}>
                        Crear producto
                      </button>
                    </div>

                    <div className="quick-action-card">
                      <div className="quick-action-icon">📥</div>
                      <h3>Reservas recibidas</h3>
                      <p>
                        Revisá solicitudes pendientes, confirmá reservas o
                        marcá entregas completadas.
                      </p>
                      <button onClick={() => navigate("/reservations")}>
                        Ver reservas
                      </button>
                    </div>
                  </>
                )}

                {isOng && (
                  <>
                    <div className="quick-action-card">
                      <div className="quick-action-icon">🔎</div>
                      <h3>Buscar productos</h3>
                      <p>
                        Consultá productos disponibles y reservá los que tu
                        organización pueda retirar.
                      </p>
                      <button onClick={() => navigate("/products")}>
                        Ver productos
                      </button>
                    </div>

                    <div className="quick-action-card">
                      <div className="quick-action-icon">📋</div>
                      <h3>Mis reservas</h3>
                      <p>
                        Seguí el estado de tus reservas pendientes, confirmadas
                        o completadas.
                      </p>
                      <button onClick={() => navigate("/reservations")}>
                        Ver mis reservas
                      </button>
                    </div>
                  </>
                )}

                <div className="quick-action-card">
                  <div className="quick-action-icon">🔔</div>
                  <h3>Notificaciones</h3>
                  <p>
                    Revisá los avisos importantes generados automáticamente por
                    la plataforma.
                  </p>
                  <button onClick={() => navigate("/notifications")}>
                    Ver notificaciones
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;