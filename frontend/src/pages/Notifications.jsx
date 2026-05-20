import { useNavigate } from "react-router-dom";

function Notifications() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="dashboard-page-modern">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">🌱</div>
          <h2>ReNova</h2>
        </div>

        <nav className="dashboard-menu">
          <button onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button onClick={() => navigate("/products")}>Productos</button>
          <button onClick={() => navigate("/reservations")}>Reservas</button>
          <button className="active">Notificaciones</button>
        </nav>

        <button className="sidebar-logout" onClick={logout}>
          Cerrar sesión
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="green-badge dashboard-badge">Notificaciones</span>
            <h1>Mensajes de <span>ReNova</span></h1>
            <p>Revisá los avisos importantes sobre productos, reservas y entregas.</p>
          </div>
        </header>

        <section className="empty-state-card">
          <div className="empty-state-icon">🔔</div>
          <h3>Sección en construcción</h3>
          <p>Por ahora no hay notificaciones, pero pronto estarán disponibles aquí.</p>
        </section>
      </main>
    </div>
  );
}

export default Notifications;
