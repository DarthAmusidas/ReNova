import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getReservations,
  updateReservationStatus,
} from "../services/reservationService";
import NotificationBell from "../components/NotificationBell";
import { pageStyles as styles, getStatusStyle } from "../styles/pageStyles";

function Reservations() {
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const userName = user?.name || "Usuario";
  const userRole = user?.role || "";

  const isSupermarket = userRole === "SUPERMARKET";
  const isOng = userRole === "ONG";

  const roleLabel = isSupermarket ? "Supermercado" : "ONG";
  const userIcon = isSupermarket ? "🛒" : "🤝";

  const loadReservations = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getReservations();

      const reservationList = Array.isArray(data)
        ? data
        : data.reservations || data.data || [];

      setReservations(reservationList);
    } catch (err) {
      console.error("Error cargando reservas:", err);
      setError("No se pudieron cargar las reservas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleUpdateStatus = async (reservationId, status) => {
    try {
      setUpdatingId(reservationId);
      setError("");

      await updateReservationStatus(reservationId, status);
      await loadReservations();
    } catch (err) {
      console.error("Error actualizando reserva:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "No se pudo actualizar la reserva."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-AR");
  };

  const getStatusLabel = (status) => {
    if (status === "PENDING") return "Pendiente";
    if (status === "CONFIRMED") return "Confirmada";
    if (status === "COMPLETED") return "Completada";
    if (status === "CANCELLED" || status === "CANCELED") return "Cancelada";
    if (status === "COMPLETION_PENDING") return "Pendiente de cierre";
    return status || "Pendiente";
  };

  const getProductName = (reservation) => {
    return (
      reservation.product_name ||
      reservation.product?.name ||
      reservation.name ||
      "Producto reservado"
    );
  };

  const getCounterpartName = (reservation) => {
    if (isSupermarket) {
      return (
        reservation.ong_name ||
        reservation.ong?.name ||
        reservation.organization_name ||
        "Organización"
      );
    }

    return (
      reservation.supermarket_name ||
      reservation.supermarket?.name ||
      reservation.market_name ||
      "Supermercado"
    );
  };

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.logoBox}>
          <div style={styles.logoIcon}>🌱</div>
          <h2 style={styles.logoText}>ReNova</h2>
        </div>

        <nav style={styles.nav}>
          <button style={styles.navButton} onClick={() => navigate("/dashboard")}>
            <span>📊</span>
            Dashboard
          </button>

          <button style={styles.navButton} onClick={() => navigate("/products")}>
            <span>🥬</span>
            Productos
          </button>

          <button
            style={styles.navButtonActive}
            onClick={() => navigate("/reservations")}
          >
            <span>📋</span>
            Reservas
          </button>
        </nav>

        <button style={styles.logoutButton} onClick={handleLogout}>
          Cerrar sesión
        </button>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <span style={styles.badge}>Gestión de reservas</span>

            <h1 style={styles.title}>
              {isSupermarket ? "Reservas recibidas" : "Mis reservas"}
            </h1>

            <p style={styles.subtitle}>
              {isSupermarket
                ? "Revisá las solicitudes realizadas por organizaciones y confirmá las entregas."
                : "Consultá el estado de tus reservas y confirmá la recepción de productos."}
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

        {error && <div style={styles.errorBox}>{error}</div>}

        {loading ? (
          <section style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>Cargando reservas...</h2>
            <p style={styles.emptyText}>Estamos consultando las reservas registradas.</p>
          </section>
        ) : reservations.length === 0 ? (
          <section style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>No hay reservas para mostrar</h2>
            <p style={styles.emptyText}>
              {isSupermarket
                ? "Todavía no recibiste reservas sobre tus productos."
                : "Todavía no realizaste reservas."}
            </p>
          </section>
        ) : (
          <section style={styles.cardsGrid}>
            {reservations.map((reservation) => {
              const status = reservation.status || "PENDING";
              const isUpdating = updatingId === reservation.id;

              return (
                <article key={reservation.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h2 style={styles.cardTitle}>
                        {getProductName(reservation)}
                      </h2>

                      <p style={styles.cardText}>
                        {isSupermarket
                          ? "Reserva solicitada por una organización."
                          : "Reserva realizada a un supermercado."}
                      </p>
                    </div>

                    <div style={styles.cardIcon}>📋</div>
                  </div>

                  <span style={getStatusStyle(status)}>{getStatusLabel(status)}</span>

                  <div style={styles.metaGrid}>
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>
                        {isSupermarket ? "ONG" : "Supermercado"}
                      </span>
                      <span style={styles.metaValue}>
                        {getCounterpartName(reservation)}
                      </span>
                    </div>

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Cantidad</span>
                      <span style={styles.metaValue}>
                        {reservation.quantity_reserved ||
                          reservation.quantity ||
                          0}
                      </span>
                    </div>

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Fecha</span>
                      <span style={styles.metaValue}>
                        {formatDate(reservation.reserved_at || reservation.created_at)}
                      </span>
                    </div>

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>ID reserva</span>
                      <span style={styles.metaValue}>
                        {String(reservation.id).slice(0, 8)}
                      </span>
                    </div>
                  </div>

                  {(reservation.supermarket_completed !== undefined ||
                    reservation.ong_completed !== undefined) && (
                    <div
                      style={{
                        marginTop: "18px",
                        background: "#f7faf4",
                        border: "1px solid #e6efdf",
                        borderRadius: "18px",
                        padding: "14px",
                      }}
                    >
                      <span style={styles.metaLabel}>Confirmación de entrega</span>

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                          marginTop: "8px",
                        }}
                      >
                        <span style={getStatusStyle(
                          reservation.supermarket_completed
                            ? "COMPLETED"
                            : "PENDING"
                        )}>
                          Supermercado:{" "}
                          {reservation.supermarket_completed
                            ? "confirmado"
                            : "pendiente"}
                        </span>

                        <span style={getStatusStyle(
                          reservation.ong_completed ? "COMPLETED" : "PENDING"
                        )}>
                          ONG:{" "}
                          {reservation.ong_completed ? "confirmado" : "pendiente"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div style={styles.cardActions}>
                    {isSupermarket && status === "PENDING" && (
                      <>
                        <button
                          type="button"
                          style={styles.primaryButton}
                          disabled={isUpdating}
                          onClick={() =>
                            handleUpdateStatus(reservation.id, "CONFIRMED")
                          }
                        >
                          Confirmar
                        </button>

                        <button
                          type="button"
                          style={styles.dangerButton}
                          disabled={isUpdating}
                          onClick={() =>
                            handleUpdateStatus(reservation.id, "CANCELLED")
                          }
                        >
                          Cancelar
                        </button>
                      </>
                    )}

                    {isOng && status === "PENDING" && (
                      <button
                        type="button"
                        style={styles.dangerButton}
                        disabled={isUpdating}
                        onClick={() =>
                          handleUpdateStatus(reservation.id, "CANCELLED")
                        }
                      >
                        Cancelar reserva
                      </button>
                    )}

                    {status === "CONFIRMED" && (
                      <>
                        <button
                          type="button"
                          style={styles.primaryButton}
                          disabled={isUpdating}
                          onClick={() =>
                            handleUpdateStatus(reservation.id, "COMPLETED")
                          }
                        >
                          {isSupermarket
                            ? "Confirmé entrega"
                            : "Confirmé recepción"}
                        </button>

                        <button
                          type="button"
                          style={styles.dangerButton}
                          disabled={isUpdating}
                          onClick={() =>
                            handleUpdateStatus(reservation.id, "CANCELLED")
                          }
                        >
                          Cancelar
                        </button>
                      </>
                    )}

                    {(status === "COMPLETED" ||
                      status === "CANCELLED" ||
                      status === "CANCELED") && (
                      <button type="button" style={styles.secondaryButton}>
                        Sin acciones pendientes
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}

export default Reservations;