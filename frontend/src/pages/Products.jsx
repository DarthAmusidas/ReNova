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
  const [pickupPersonName, setPickupPersonName] = useState("");
  const [pickupPersonDni, setPickupPersonDni] = useState("");
  const [pickupPersonPhone, setPickupPersonPhone] = useState("");
  const [pickupNotes, setPickupNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("ALL");

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const userName = user?.name || "Usuario";
  const userRole = user?.role || "";

  const isSupermarket = userRole === "SUPERMARKET";
  const isOng = userRole === "ONG";
  const isAdmin = userRole === "ADMIN";

  const roleLabel = isSupermarket
    ? "Supermercado"
    : isAdmin
    ? "Administrador"
    : "ONG";

  const userIcon = isSupermarket ? "🛒" : isAdmin ? "🛡️" : "🤝";

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

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
    setPickupPersonName("");
    setPickupPersonDni("");
    setPickupPersonPhone("");
    setPickupNotes("");
    setError("");
    setSuccess("");
  };

  const handleReserve = async () => {
    if (!selectedProduct) return;

    const quantity = Number(reservationQuantity);

    if (!pickupPersonName.trim()) {
      setError("Ingresá el nombre de la persona que retira.");
      return;
    }

    if (!pickupPersonDni.trim()) {
      setError("Ingresá el DNI de la persona que retira.");
      return;
    }

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
        pickup_person_name: pickupPersonName.trim(),
        pickup_person_dni: pickupPersonDni.trim(),
        pickup_person_phone: pickupPersonPhone.trim(),
        pickup_notes: pickupNotes.trim(),
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

  const isProductSoonToExpire = (expirationDate) => {
    if (!expirationDate) return false;
    const today = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiry = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  };

  const getFilteredProducts = () => {
    if (selectedFilter === "ALL") {
      return products;
    }

    return products.filter((product) => {
      const status = product.status || "AVAILABLE";
      const isAvailable = status === "AVAILABLE";
      
      if (selectedFilter === "AVAILABLE") return isAvailable;
      if (selectedFilter === "UNAVAILABLE") return !isAvailable;
      if (selectedFilter === "LOW_ROTATION") return product.low_rotation === true;
      if (selectedFilter === "SOON_TO_EXPIRE") return isProductSoonToExpire(product.expiration_date);
      
      return true;
    });
  };

  const getProductCounts = () => {
    const counts = {
      ALL: products.length,
      AVAILABLE: 0,
      UNAVAILABLE: 0,
      LOW_ROTATION: 0,
      SOON_TO_EXPIRE: 0,
    };

    products.forEach((product) => {
      const status = product.status || "AVAILABLE";
      const isAvailable = status === "AVAILABLE";
      
      if (isAvailable) counts.AVAILABLE++;
      if (!isAvailable) counts.UNAVAILABLE++;
      if (product.low_rotation === true) counts.LOW_ROTATION++;
      if (isProductSoonToExpire(product.expiration_date)) counts.SOON_TO_EXPIRE++;
    });

    return counts;
  };

  const productCounts = getProductCounts();
  const filteredProducts = getFilteredProducts();

  const getPageTitle = () => {
    if (isAdmin) return "Productos registrados";
    if (isSupermarket) return "Mis productos publicados";
    return "Productos disponibles";
  };

  const getPageSubtitle = () => {
    if (isAdmin) {
      return "Consultá los productos registrados en la plataforma.";
    }

    if (isSupermarket) {
      return "Administrá los productos disponibles para donar y revisá su estado.";
    }

    return "Consultá productos disponibles y realizá reservas para tu organización.";
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

          {isAdmin && (
            <button style={styles.navButton} onClick={() => navigate("/users")}>
              <span>👥</span>
              Usuarios
            </button>
          )}
        </nav>

        <button style={styles.logoutButton} onClick={handleLogout}>
          Cerrar sesión
        </button>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <span style={styles.badge}>
              {isAdmin ? "Administración de productos" : "Gestión de productos"}
            </span>

            <h1 style={styles.title}>{getPageTitle()}</h1>

            <p style={styles.subtitle}>{getPageSubtitle()}</p>
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

        {isAdmin && (
          <div style={localStyles.adminInfoBox}>
            El administrador puede consultar productos, pero no modifica ni
            realiza reservas desde esta vista.
          </div>
        )}

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

        <div style={localStyles.filterBar}>
          {[
            { key: "ALL", label: "Todas", count: productCounts.ALL },
            { key: "AVAILABLE", label: "Disponibles", count: productCounts.AVAILABLE },
            { key: "UNAVAILABLE", label: "No disponibles", count: productCounts.UNAVAILABLE },
            { key: "LOW_ROTATION", label: "Baja rotación", count: productCounts.LOW_ROTATION, title: "Productos con poco movimiento de venta" },
            { key: "SOON_TO_EXPIRE", label: "Próx. a vencer", count: productCounts.SOON_TO_EXPIRE, title: "Productos que vencen en los próximos 7 días" },
          ].map((filter) => (
            <button
              key={filter.key}
              style={
                selectedFilter === filter.key
                  ? localStyles.filterButtonActive
                  : localStyles.filterButton
              }
              onClick={() => setSelectedFilter(filter.key)}
              title={filter.title}
            >
              {filter.label} <span style={localStyles.filterCount}>{filter.count}</span>
            </button>
          ))}
        </div>

        <div style={{ height: "22px" }} />

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        {loading ? (
          <section style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>Cargando productos...</h2>
            <p style={styles.emptyText}>
              Estamos consultando la información disponible.
            </p>
          </section>
        ) : filteredProducts.length === 0 ? (
          <section style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>No hay productos para mostrar</h2>
            <p style={styles.emptyText}>
              {selectedFilter !== "ALL"
                ? `No hay productos ${selectedFilter === "AVAILABLE" ? "disponibles" : selectedFilter === "UNAVAILABLE" ? "no disponibles" : selectedFilter === "LOW_ROTATION" ? "con baja rotación" : "próximos a vencer"}.`
                : isSupermarket
                ? "Todavía no cargaste productos disponibles para donar."
                : "Por el momento no hay productos disponibles para visualizar."}
            </p>
          </section>
        ) : (
          <section style={styles.cardsGrid}>
            {filteredProducts.map((product) => {
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
                      <span style={styles.metaValue}>
                        {product.category || "-"}
                      </span>
                    </div>

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Vencimiento</span>
                      <span style={styles.metaValue}>
                        {formatDate(product.expiration_date)}
                      </span>
                    </div>

                    <div style={styles.metaItem} title="Indica si el producto tiene poco movimiento de venta. Estos productos tienen mayor necesidad de ser donados.">
                      <span style={styles.metaLabel}>Baja rotación</span>
                      <span style={styles.metaValue}>
                        {product.low_rotation ? "Sí" : "No"}
                      </span>
                    </div>
                  </div>

                  <div style={styles.cardActions}>
                    {isAdmin && (
                      <button type="button" style={styles.disabledButton} disabled>
                        Solo consulta
                      </button>
                    )}

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

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Nombre de la persona que retira</label>
                <input
                  style={styles.input}
                  type="text"
                  value={pickupPersonName}
                  onChange={(e) => setPickupPersonName(e.target.value)}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>DNI de la persona que retira</label>
                <input
                  style={styles.input}
                  type="text"
                  value={pickupPersonDni}
                  onChange={(e) => setPickupPersonDni(e.target.value)}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Teléfono de la persona que retira (opcional)</label>
                <input
                  style={styles.input}
                  type="text"
                  value={pickupPersonPhone}
                  onChange={(e) => setPickupPersonPhone(e.target.value)}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Notas de retiro (opcional)</label>
                <textarea
                  style={{
                    ...styles.input,
                    minHeight: "110px",
                    padding: "14px 16px",
                    resize: "vertical",
                  }}
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
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

const localStyles = {
  adminInfoBox: {
    background: "#eef7e7",
    border: "1px solid #d8ebce",
    color: "#1f6f21",
    borderRadius: "18px",
    padding: "16px 18px",
    fontWeight: 800,
    marginBottom: "22px",
  },

  filterBar: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "24px",
  },

  filterButton: {
    border: "1px solid #d6e4d0",
    borderRadius: "20px",
    background: "#ffffff",
    color: "#223025",
    padding: "10px 18px",
    fontWeight: 800,
    fontSize: "0.95rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  filterButtonActive: {
    border: "2px solid #2f9728",
    borderRadius: "20px",
    background: "#e8f4df",
    color: "#1d7d24",
    padding: "10px 18px",
    fontWeight: 900,
    fontSize: "0.95rem",
    cursor: "pointer",
  },

  filterCount: {
    marginLeft: "6px",
    background: "rgba(0,0,0,0.08)",
    padding: "2px 8px",
    borderRadius: "999px",
    fontSize: "0.85rem",
    fontWeight: 900,
  },
};

export default Products;