import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProducts, deleteProduct } from "../services/productService";
import { createReservation } from "../services/reservationService";
import NotificationBell from "../components/NotificationBell";
import { pageStyles as styles, getStatusStyle } from "../styles/pageStyles";

function Products() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [reservationQuantity, setReservationQuantity] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const userName = user?.name || "Usuario";
  const userRole = user?.role || "";

  const isSupermarket = userRole === "SUPERMARKET";
  const isOng = userRole === "ONG";

  const roleLabel = isSupermarket ? "Supermercado" : "ONG";
  const userIcon = isSupermarket ? "🛒" : "🤝";

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();

      const productList = Array.isArray(data)
        ? data
        : data.products || data.data || [];

      setProducts(productList);
    } catch (err) {
      console.error("Error cargando productos:", err);
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleOpenReservation = (product) => {
    setSelectedProduct(product);
    setReservationQuantity(1);
    setError("");
    setSuccess("");
  };

  const handleReserve = async () => {
    if (!selectedProduct) return;

    const quantity = Number(reservationQuantity);

    if (!quantity || quantity <= 0) {
      setError("Ingresá una cantidad válida.");
      return;
    }

    if (quantity > selectedProduct.quantity) {
      setError("La cantidad solicitada supera el stock disponible.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      await createReservation({
        product_id: selectedProduct.id,
        quantity_reserved: quantity,
      });

      setSuccess("Reserva creada correctamente.");
      setSelectedProduct(null);
      await loadProducts();
    } catch (err) {
      console.error("Error creando reserva:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "No se pudo crear la reserva."
      );
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      setError("");
      await deleteProduct(productToDelete.id);
      setProductToDelete(null);
      await loadProducts();
    } catch (err) {
      console.error("Error eliminando producto:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "No se pudo eliminar el producto."
      );
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("es-AR");
  };

  const getProductStatusLabel = (status) => {
    if (status === "AVAILABLE") return "Disponible";
    if (status === "UNAVAILABLE") return "No disponible";
    return status || "Disponible";
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

          <button style={styles.navButtonActive} onClick={() => navigate("/products")}>
            <span>🥬</span>
            Productos
          </button>

          <button style={styles.navButton} onClick={() => navigate("/reservations")}>
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
            <span style={styles.badge}>Gestión de productos</span>

            <h1 style={styles.title}>
              {isSupermarket ? "Mis productos publicados" : "Productos disponibles"}
            </h1>

            <p style={styles.subtitle}>
              {isSupermarket
                ? "Administrá los productos disponibles para donar y revisá su estado."
                : "Consultá productos disponibles y realizá reservas para tu organización."}
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

        <div style={styles.topActions}>
          {isSupermarket && (
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => navigate("/products/create")}
            >
              + Cargar producto
            </button>
          )}
        </div>

        <div style={{ height: "22px" }} />

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        {loading ? (
          <section style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>Cargando productos...</h2>
            <p style={styles.emptyText}>Estamos consultando la información disponible.</p>
          </section>
        ) : products.length === 0 ? (
          <section style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>No hay productos para mostrar</h2>
            <p style={styles.emptyText}>
              {isSupermarket
                ? "Todavía no cargaste productos disponibles para donar."
                : "Por el momento no hay productos disponibles para reservar."}
            </p>
          </section>
        ) : (
          <section style={styles.cardsGrid}>
            {products.map((product) => {
              const isAvailable =
                !product.status || product.status === "AVAILABLE";

              return (
                <article key={product.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h2 style={styles.cardTitle}>{product.name}</h2>

                      <p style={styles.cardText}>
                        {product.description || "Sin descripción disponible."}
                      </p>
                    </div>

                    <div style={styles.cardIcon}>🥬</div>
                  </div>

                  <span style={getStatusStyle(product.status || "AVAILABLE")}>
                    {getProductStatusLabel(product.status)}
                  </span>

                  <div style={styles.metaGrid}>
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Cantidad</span>
                      <span style={styles.metaValue}>
                        {product.quantity} {product.unit || "unidades"}
                      </span>
                    </div>

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Categoría</span>
                      <span style={styles.metaValue}>{product.category || "-"}</span>
                    </div>

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Vencimiento</span>
                      <span style={styles.metaValue}>
                        {formatDate(product.expiration_date)}
                      </span>
                    </div>

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Baja rotación</span>
                      <span style={styles.metaValue}>
                        {product.low_rotation ? "Sí" : "No"}
                      </span>
                    </div>
                  </div>

                  <div style={styles.cardActions}>
                    {isSupermarket && (
                      <>
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          onClick={() => navigate(`/products/${product.id}/edit`)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          style={styles.dangerButton}
                          onClick={() => setProductToDelete(product)}
                        >
                          Eliminar
                        </button>
                      </>
                    )}

                    {isOng && isAvailable && product.quantity > 0 && (
                      <button
                        type="button"
                        style={styles.primaryButton}
                        onClick={() => handleOpenReservation(product)}
                      >
                        Reservar
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {selectedProduct && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <h2 style={styles.modalTitle}>Reservar producto</h2>

              <p style={styles.modalText}>
                Vas a reservar <strong>{selectedProduct.name}</strong>. Stock
                disponible:{" "}
                <strong>
                  {selectedProduct.quantity} {selectedProduct.unit || "unidades"}
                </strong>
                .
              </p>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Cantidad a reservar</label>
                <input
                  style={styles.input}
                  type="number"
                  min="1"
                  max={selectedProduct.quantity}
                  value={reservationQuantity}
                  onChange={(e) => setReservationQuantity(e.target.value)}
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setSelectedProduct(null)}
                >
                  Cancelar
                </button>

                <button type="button" style={styles.primaryButton} onClick={handleReserve}>
                  Confirmar reserva
                </button>
              </div>
            </div>
          </div>
        )}

        {productToDelete && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <h2 style={styles.modalTitle}>Eliminar producto</h2>

              <p style={styles.modalText}>
                ¿Seguro que querés eliminar{" "}
                <strong>{productToDelete.name}</strong>? Esta acción no se puede
                deshacer.
              </p>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setProductToDelete(null)}
                >
                  Cancelar
                </button>

                <button type="button" style={styles.dangerButton} onClick={handleDelete}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Products;