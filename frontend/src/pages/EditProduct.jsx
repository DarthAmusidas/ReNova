import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProducts, updateProduct } from "../services/productService";

function EditProduct() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    quantity: "",
    unit: "",
    expiration_date: "",
    low_rotation: false,
    status: "AVAILABLE",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const data = await getProducts();
        const product = data.products.find((item) => String(item.id) === id);

        if (!product) {
          setError("Producto no encontrado");
          setLoading(false);
          return;
        }

        setForm({
          name: product.name || "",
          description: product.description || "",
          category: product.category || "",
          quantity: product.quantity || "",
          unit: product.unit || "",
          expiration_date: product.expiration_date
            ? product.expiration_date.slice(0, 10)
            : "",
          low_rotation: Boolean(product.low_rotation),
          status: product.status || "AVAILABLE",
        });

        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.error || "Error al cargar producto");
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await updateProduct(id, {
        ...form,
        quantity: Number(form.quantity),
      });

      setSuccess("Producto actualizado correctamente");

      setTimeout(() => {
        navigate("/products");
      }, 900);
    } catch (err) {
      setError(err.response?.data?.error || "Error al actualizar producto");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="dashboard-page-modern">
        <aside className="dashboard-sidebar">
          <div className="dashboard-brand">
            <div className="dashboard-brand-icon">🌱</div>
            <h2>ReNova</h2>
          </div>
        </aside>

        <main className="dashboard-main">
          <div className="empty-state-card">
            <div className="empty-state-icon">⏳</div>
            <h3>Cargando producto...</h3>
          </div>
        </main>
      </div>
    );
  }

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
              Editar producto
            </span>

            <h1>
              Actualizar <span>producto</span>
            </h1>

            <p>
              Modificá los datos del producto publicado por tu supermercado.
            </p>
          </div>
        </header>

        <section className="form-section-modern">
          <form className="form-card-modern" onSubmit={handleSubmit}>
            {error && <div className="error-message-modern">{error}</div>}
            {success && <div className="success-message-modern">{success}</div>}

            <div className="form-grid-modern">
              <div className="input-group-modern">
                <label>Nombre del producto</label>
                <div className="input-with-icon">
                  <span>🥫</span>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Ej: Arroz largo fino"
                  />
                </div>
              </div>

              <div className="input-group-modern">
                <label>Categoría</label>
                <div className="input-with-icon">
                  <span>🏷️</span>
                  <input
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    placeholder="Ej: Almacén"
                  />
                </div>
              </div>

              <div className="input-group-modern">
                <label>Cantidad</label>
                <div className="input-with-icon">
                  <span>📦</span>
                  <input
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    type="number"
                    min="0"
                    placeholder="Ej: 10"
                  />
                </div>
              </div>

              <div className="input-group-modern">
                <label>Unidad</label>
                <div className="input-with-icon">
                  <span>⚖️</span>
                  <input
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    placeholder="Ej: paquetes, unidades, cajas"
                  />
                </div>
              </div>

              <div className="input-group-modern">
                <label>Fecha de vencimiento</label>
                <div className="input-with-icon">
                  <span>📅</span>
                  <input
                    name="expiration_date"
                    value={form.expiration_date}
                    onChange={handleChange}
                    type="date"
                  />
                </div>
              </div>

              <div className="input-group-modern">
                <label>Estado</label>
                <div className="input-with-icon">
                  <span>📌</span>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="AVAILABLE">Disponible</option>
                    <option value="RESERVED">Reservado</option>
                    <option value="UNAVAILABLE">No disponible</option>
                  </select>
                </div>
              </div>

              <label className="checkbox-card-modern">
                <input
                  type="checkbox"
                  name="low_rotation"
                  checked={form.low_rotation}
                  onChange={handleChange}
                />
                <div>
                  <strong>Producto de baja rotación</strong>
                  <p>Marcá esta opción si el producto tiene baja salida.</p>
                </div>
              </label>
            </div>

            <div className="input-group-modern">
              <label>Descripción</label>
              <textarea
                className="textarea-modern"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Agregá detalles del producto, estado o condiciones de retiro."
              />
            </div>

            <div className="form-actions-modern">
              <button
                type="button"
                className="secondary-button-modern"
                onClick={() => navigate("/products")}
              >
                Cancelar
              </button>

              <button type="submit" className="primary-button-modern">
                Guardar cambios
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default EditProduct;