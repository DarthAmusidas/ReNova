import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getReservations,
  updateReservationStatus,
} from "../services/reservationService";
import NotificationBell from "../components/NotificationBell";

function Reservations() {
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));
  const isSupermarket = user?.role === "SUPERMARKET";
  const isOng = user?.role === "ONG";

  const loadReservations = async () => {
    try {
      const data = await getReservations();
      setReservations(data.reservations || []);
    } catch (err) {
      setError(err.response?.data?.error || "Error al cargar reservas");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialReservations = async () => {
      try {
        const data = await getReservations();

        if (isMounted) {
          setReservations(data.reservations || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.error || "Error al cargar reservas");
        }
      }
    };

    loadInitialReservations();

    return () => {
      isMounted = false;
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const changeStatus = async (reservationId, status) => {
    setError("");
    setSuccess("");

    try {
      await updateReservationStatus(reservationId, status);

      setSuccess("Reserva actualizada correctamente");
      await loadReservations();
    } catch (err) {
      setError(err.response?.data?.error || "Error al actualizar la reserva");
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      PENDING: "Pendiente",
      CONFIRMED: "Confirmada",
      COMPLETION_PENDING: "Pendiente de cierre",
      COMPLETED: "Completada",
      CANCELLED: "Cancelada",
    };

    return labels[status] || status || "Sin estado";
  };

  const getProductName = (reservation) => {
    return (
      reservation.product_name ||
      reservation.name ||
      reservation.product?.name ||
      "Producto reservado"
    );
  };

  const getQuantity = (reservation) => {
    return (
      reservation.quantity_reserved ||
      reservation.quantity ||
      reservation.reserved_quantity ||
      "-"
    );
  };

  const getReservationDate = (reservation) => {
    if (!reservation.created_at) {
      return "-";
    }

    return new Date(reservation.created_at).toLocaleDateString("es-AR");
  };

  const getStatusStyle = (status) => {
    const base = {
      display: "inline-flex",
      alignItems: "center",
      width: "fit-content",
      padding: "8px 14px",
      borderRadius: "999px",
      fontSize: "0.78rem",
      fontWeight: 900,
    };

    if (status === "PENDING") {
      return {
        ...base,
        background: "#fff8e8",
        color: "#b37b00",
      };
    }

    if (status === "CANCELLED") {
      return {
        ...base,
        background: "#fff1ef",
        color: "#c0392b",
      };
    }

    if (status === "COMPLETED") {
      return {
        ...base,
        background: "#e8f4df",
        color: "#1f7a2e",
      };
    }

    if (status === "COMPLETION_PENDING") {
      return {
        ...base,
        background: "#fff8e8",
        color: "#b37b00",
      };
    }

    return {
      ...base,
      background: "#e8f4df",
      color: "#2f8f2c",
    };
  };

  const styles = {
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: "24px",
      width: "100%",
    },

    card: {
      background: "#ffffff",
      border: "1px solid #dbead3",
      borderRadius: "28px",
      padding: "28px",
      boxShadow: "0 14px 34px rgba(43, 69, 38, 0.06)",
    },

    cardHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "20px",
    },

    icon: {
      width: "64px",
      height: "64px",
      borderRadius: "20px",
      background: "#e8f4df",
      color: "#2f8f2c",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "1.8rem",
    },

    title: {
      margin: "0 0 10px",
      fontSize: "1.55rem",
      color: "#102018",
    },

    description: {
      margin: "0 0 22px",
      color: "#667066",
      lineHeight: 1.7,
      minHeight: "72px",
    },

    dataGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: "14px",
      marginBottom: "18px",
    },

    dataBox: {
      background: "#f4faf0",
      border: "1px solid #dcebd5",
      borderRadius: "18px",
      padding: "14px",
    },

    dataLabel: {
      display: "block",
      color: "#667066",
      fontSize: "0.82rem",
      fontWeight: 700,
      marginBottom: "6px",
    },

    dataValue: {
      display: "block",
      color: "#102018",
      fontSize: "0.98rem",
      fontWeight: 900,
    },

    completionBox: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: "14px",
      marginBottom: "22px",
    },

    completionItem: {
      background: "#fffdf4",
      border: "1px solid #efe3b5",
      borderRadius: "18px",
      padding: "14px",
    },

    actionsRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px",
    },

    empty: {
      gridColumn: "1 / -1",
      background: "#ffffff",
      border: "1px solid #dbead3",
      borderRadius: "30px",
      padding: "50px",
      textAlign: "center",
      boxShadow: "0 14px 34px rgba(43, 69, 38, 0.06)",
    },

    emptyIcon: {
      fontSize: "3rem",
      marginBottom: "16px",
    },
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
        </nav>

        <button className="sidebar-logout" onClick={logout}>
          Cerrar sesión
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="green-badge dashboard-badge">
              Gestión de reservas
            </span>

            <h1>
              Reservas <span>ReNova</span>
            </h1>

            <p>
              Consultá, confirmá y cerrá las reservas realizadas sobre productos
              disponibles en la plataforma.
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
            <NotificationBell />
          </div>
        </header>

        {error && <div className="error-message-modern">{error}</div>}
        {success && <div className="success-message-modern">{success}</div>}

        <section style={styles.grid}>
          {reservations.length === 0 && (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>📋</div>
              <h3>No hay reservas</h3>
              <p>
                Cuando una organización reserve productos, las reservas
                aparecerán en esta sección.
              </p>
            </div>
          )}

          {reservations.map((reservation) => (
            <article style={styles.card} key={reservation.id}>
              <div style={styles.cardHeader}>
                <div style={styles.icon}>📋</div>

                <span style={getStatusStyle(reservation.status)}>
                  {getStatusLabel(reservation.status)}
                </span>
              </div>

              <h3 style={styles.title}>{getProductName(reservation)}</h3>

              <p style={styles.description}>
                Reserva generada dentro de ReNova para coordinar la entrega del
                producto entre supermercado y organización.
              </p>

              <div style={styles.dataGrid}>
                <div style={styles.dataBox}>
                  <span style={styles.dataLabel}>Cantidad reservada</span>
                  <strong style={styles.dataValue}>
                    {getQuantity(reservation)}
                  </strong>
                </div>

                <div style={styles.dataBox}>
                  <span style={styles.dataLabel}>Estado</span>
                  <strong style={styles.dataValue}>
                    {getStatusLabel(reservation.status)}
                  </strong>
                </div>

                <div style={styles.dataBox}>
                  <span style={styles.dataLabel}>Fecha</span>
                  <strong style={styles.dataValue}>
                    {getReservationDate(reservation)}
                  </strong>
                </div>

                <div style={styles.dataBox}>
                  <span style={styles.dataLabel}>ID reserva</span>
                  <strong style={styles.dataValue}>
                    {reservation.id?.slice(0, 8)}...
                  </strong>
                </div>
              </div>

              {reservation.status !== "CANCELLED" &&
                reservation.status !== "COMPLETED" && (
                  <div style={styles.completionBox}>
                    <div style={styles.completionItem}>
                      <span style={styles.dataLabel}>Supermercado</span>
                      <strong style={styles.dataValue}>
                        {reservation.supermarket_completed
                          ? "Confirmó entrega"
                          : "Pendiente"}
                      </strong>
                    </div>

                    <div style={styles.completionItem}>
                      <span style={styles.dataLabel}>ONG</span>
                      <strong style={styles.dataValue}>
                        {reservation.ong_completed
                          ? "Confirmó recepción"
                          : "Pendiente"}
                      </strong>
                    </div>
                  </div>
                )}

              {isSupermarket && reservation.status === "PENDING" && (
                <div style={styles.actionsRow}>
                  <button
                    className="primary-button-modern"
                    onClick={() => changeStatus(reservation.id, "CONFIRMED")}
                  >
                    Confirmar
                  </button>

                  <button
                    className="danger-button-modern"
                    onClick={() => changeStatus(reservation.id, "CANCELLED")}
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {isSupermarket && reservation.status === "CONFIRMED" && (
                <div style={styles.actionsRow}>
                  <button
                    className="primary-button-modern"
                    onClick={() => changeStatus(reservation.id, "COMPLETED")}
                  >
                    Confirmé entrega
                  </button>

                  <button
                    className="danger-button-modern"
                    onClick={() => changeStatus(reservation.id, "CANCELLED")}
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {isOng && reservation.status === "CONFIRMED" && (
                <div style={styles.actionsRow}>
                  <button
                    className="primary-button-modern"
                    onClick={() => changeStatus(reservation.id, "COMPLETED")}
                  >
                    Confirmé recepción
                  </button>

                  <button
                    className="danger-button-modern"
                    onClick={() => changeStatus(reservation.id, "CANCELLED")}
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {isOng && reservation.status === "PENDING" && (
                <button
                  className="danger-button-modern"
                  style={{ width: "100%" }}
                  onClick={() => changeStatus(reservation.id, "CANCELLED")}
                >
                  Cancelar reserva
                </button>
              )}
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

export default Reservations;