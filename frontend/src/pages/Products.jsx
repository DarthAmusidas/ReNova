import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProducts, deleteProduct } from "../services/productService";
import { createReservation } from "../services/reservationService";

function Products() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantityReserved, setQuantityReserved] = useState("");
  const [productToDelete, setProductToDelete] = useState(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const isSupermarket = user?.role === "SUPERMARKET";
  const isOng = user?.role === "ONG";

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data.products || []);
    } catch (err) {
      setError(err.response?.data?.error || "Error al cargar productos");
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const openReservationModal = (product) => {
    setSelectedProduct(product);
    setQuantityReserved("");
    setError("");
    setSuccess("");
  };

  const closeReservationModal = () => {
    setSelectedProduct(null);
    setQuantityReserved("");
  };

  const handleReserve = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedProduct) return;

    try {
      await createReservation({
        product_id: selectedProduct.id,
        quantity_reserved: Number(quantityReserved),
      });

      setSuccess("Reserva creada correctamente");
      closeReservationModal();
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.error || "Error al crear la reserva");
    }
  };

  const openDeleteModal = (product) => {
    setProductToDelete(product);
    setError("");
    setSuccess("");
  };

  const closeDeleteModal = () => {
    setProductToDelete(null);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setError("");
    setSuccess("");

    try {
      await deleteProduct(productToDelete.id);

      setSuccess("Producto eliminado correctamente");
      setProductToDelete(null);
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.error || "Error al eliminar producto");
      setProductToDelete(null);
    }
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
          <button className="active">Productos</button>
          <button onClick={() => navigate("/reservations")}>Reservas</button>
          <button onClick={() => navigate("/notifications")}>
            Notificaciones
          </button>
        </nav>

        <button className="sidebar-logout" onClick={logout}>
          Cerrar sesión
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="green-badge dashboard-badge">
              Productos disponibles
            </span>

            <h1>
              Productos <span>ReNova</span>
            </h1>

            <p>
              Consultá los productos disponibles para donación y reserva dentro
              de la plataforma.
            </p>
          </div>

          {isSupermarket && (
            <button
              className="topbar-action-button"
              onClick={() => navigate("/products/create")}
            >
              Cargar producto
            </button>
          )}
        </header>

        {error && <div className="error-message-modern">{error}</div>}
        {success && <div className="success-message-modern">{success}</div>}

        <section className="products-grid-modern">
          {products.length === 0 && (
            <div className="empty-state-card">
              <div className="empty-state-icon">📦</div>
              <h3>No hay productos disponibles</h3>
              <p>Cuando un supermercado cargue productos, aparecerán acá.</p>
            </div>
          )}

          {products.map((product) => (
            <article className="product-card-modern" key={product.id}>
              <div className="product-card-header">
                <div className="product-card-icon">🥫</div>

                <span className="product-status-badge">
                  {product.status || "AVAILABLE"}
                </span>
              </div>

              <div className="product-card-content">
                <h3>{product.name}</h3>

                <p>{product.description || "Sin descripción"}</p>

                <div className="product-data-grid">
                  <div>
                    <span>Cantidad</span>
                    <strong>
                      {product.quantity} {product.unit}
                    </strong>
                  </div>

                  <div>
                    <span>Categoría</span>
                    <strong>{product.category || "General"}</strong>
                  </div>

                  <div>
                    <span>Vencimiento</span>
                    <strong>
                      {product.expiration_date
                        ? new Date(product.expiration_date).toLocaleDateString(
                            "es-AR"
                          )
                        : "Sin fecha"}
                    </strong>
                  </div>

                  <div>
                    <span>Baja rotación</span>
                    <strong>{product.low_rotation ? "Sí" : "No"}</strong>
                  </div>
                </div>

                {isSupermarket && (
                  <div className="product-actions-row">
                    <button
                      className="product-action-button"
                      onClick={() => navigate(`/products/${product.id}/edit`)}
                    >
                      Editar producto
                    </button>

                    <button
                      className="product-delete-button"
                      onClick={() => openDeleteModal(product)}
                    >
                      Eliminar
                    </button>
                  </div>
                )}

                {isOng && (
                  <button
                    className="product-action-button"
                    onClick={() => openReservationModal(product)}
                  >
                    Reservar producto
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      </main>

      {selectedProduct && (
        <div className="modal-overlay-modern">
          <div className="modal-card-modern">
            <div className="modal-header-modern">
              <div>
                <span className="green-badge">Nueva reserva</span>
                <h2>{selectedProduct.name}</h2>
              </div>

              <button
                className="modal-close-button"
                onClick={closeReservationModal}
              >
                ×
              </button>
            </div>

            <p className="modal-description-modern">
              Disponible:{" "}
              <strong>
                {selectedProduct.quantity} {selectedProduct.unit}
              </strong>
            </p>

            <form onSubmit={handleReserve}>
              <div className="input-group-modern">
                <label>Cantidad a reservar</label>
                <div className="input-with-icon">
                  <span>📦</span>
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct.quantity}
                    value={quantityReserved}
                    onChange={(e) => setQuantityReserved(e.target.value)}
                    placeholder="Ej: 2"
                  />
                </div>
              </div>

              <div className="form-actions-modern">
                <button
                  type="button"
                  className="secondary-button-modern"
                  onClick={closeReservationModal}
                >
                  Cancelar
                </button>

                <button type="submit" className="primary-button-modern">
                  Confirmar reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {productToDelete && (
        <div className="modal-overlay-modern">
          <div className="delete-modal-card">
            <div className="delete-modal-icon">🗑️</div>

            <h2>Eliminar producto</h2>

            <p>
              ¿Seguro que querés eliminar el producto{" "}
              <strong>"{productToDelete.name}"</strong>?
            </p>

            <div className="delete-warning-box">
              Esta acción no se puede deshacer. Si el producto tiene reservas
              asociadas, el sistema no permitirá eliminarlo.
            </div>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="secondary-button-modern"
                onClick={closeDeleteModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="danger-button-modern"
                onClick={handleDeleteProduct}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;