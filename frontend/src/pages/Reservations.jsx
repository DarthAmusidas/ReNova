import { useNavigate } from "react-router-dom";

function Reservations() {
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
          <button className="active">Reservas</button>
          <button onClick={() => navigate("/notifications")}>Notificaciones</button>
        </nav>

        <button className="sidebar-logout" onClick={logout}>
          Cerrar sesión
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="green-badge dashboard-badge">Reservas</span>
            <h1>Gestión de <span>reservas</span></h1>
            <p>Revisá y administrá las solicitudes de reservas realizadas en ReNova.</p>
          </div>
        </header>

        <section className="empty-state-card">
          <div className="empty-state-icon">📋</div>
          <h3>Sección en construcción</h3>
          <p>Próximamente podrás ver y gestionar todas las reservas desde aquí.</p>
        </section>
      </main>
    </div>
  );
}

export default Reservations;
