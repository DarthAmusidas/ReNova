import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProduct } from "../services/productService";

function CreateProduct() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    quantity: "",
    unit: "unidades",
    expiration_date: "",
    low_rotation: false,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      await createProduct({
        ...form,
        quantity: Number(form.quantity),
      });

      setSuccess("Producto creado correctamente");

      setTimeout(() => {
        navigate("/products");
      }, 900);
    } catch (err) {
      setError(err.response?.data?.error || "Error al crear producto");
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

        <button
          className="sidebar-logout"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
          }}
        >
          Cerrar sesión
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="green-badge dashboard-badge">
              Nuevo producto
            </span>

            <h1>
              Cargar <span>producto</span>
            </h1>

            <p>
              Publicá un producto disponible para que pueda ser visualizado y
              reservado por una organización.
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
                    placeholder="Ej: Fideos secos"
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
                Crear producto
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default CreateProduct;