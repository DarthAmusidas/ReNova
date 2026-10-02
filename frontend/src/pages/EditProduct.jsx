import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProducts, updateProduct } from "../services/productService";
import AppSidebar from "../components/AppSidebar";
import HeaderUserCard from "../components/HeaderUserCard";
import UiIcon from "../components/UiIcon";
import CategorySelect from "../components/CategorySelect";
import useProductCategories from "../hooks/useProductCategories";
import { findCategoryByName } from "../utils/categories";
import { pageStyles as pageStyles } from "../styles/pageStyles";

function EditProduct() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    quantity: "",
    unit: "unidades",
    expiration_date: "",
    low_rotation: false,
    status: "AVAILABLE",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const categories = useProductCategories();

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const userName = user?.name || "Usuario";
  const userRole = user?.role || "";

  const isSupermarket = userRole === "SUPERMARKET";
  const isAdmin = userRole === "ADMIN";
  const roleLabel = isSupermarket ? "Supermercado" : "ONG";
  const formatDateForInput = (date) => {
    if (!date) return "";

    if (String(date).includes("T")) {
      return String(date).split("T")[0];
    }

    return String(date).slice(0, 10);
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getProducts();

      const productList = Array.isArray(data)
        ? data
        : data.products || data.data || [];

      const product = productList.find((item) => String(item.id) === String(id));

      if (!product) {
        setError("No se encontró el producto solicitado.");
        return;
      }

      setFormData({
        name: product.name || "",
        description: product.description || "",
        category: product.category || "",
        quantity: product.quantity || "",
        unit: product.unit || "unidades",
        expiration_date: formatDateForInput(product.expiration_date),
        low_rotation: Boolean(product.low_rotation),
        // RESERVED es un estado viejo equivalente a "sin stock".
        status: product.status === "RESERVED" ? "UNAVAILABLE" : product.status || "AVAILABLE",
      });
    } catch (err) {
      console.error("Error cargando producto:", err);

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "No se pudo cargar el producto."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [id]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((currentData) => {
      const nextData = {
        ...currentData,
        [name]: type === "checkbox" ? checked : value,
      };

      // Sin stock no puede quedar disponible.
      if (name === "quantity" && value !== "" && Number(value) === 0) {
        nextData.status = "UNAVAILABLE";
      }

      return nextData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Ingresá el nombre del producto.");
      return;
    }

    if (!formData.category.trim()) {
      setError("Elegí una categoría.");
      return;
    }

    // Se permite 0: el producto queda "No disponible" hasta reponer stock.
    if (
      formData.quantity === "" ||
      Number.isNaN(Number(formData.quantity)) ||
      Number(formData.quantity) < 0
    ) {
      setError("Ingresá una cantidad válida (0 o más).");
      return;
    }

    try {
      setSaving(true);

      await updateProduct(id, {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        category_id: findCategoryByName(categories, formData.category)?.id || null,
        quantity: Number(formData.quantity),
        unit: formData.unit,
        expiration_date: formData.expiration_date || null,
        low_rotation: formData.low_rotation,
        status: formData.status,
      });

      setSuccess("Producto actualizado correctamente.");
      setTimeout(() => navigate("/products"), 1200);
    } catch (err) {
      console.error("Error actualizando producto:", err);

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "No se pudo actualizar el producto."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.layout} className="renova-form-shell">
      <AppSidebar
        active="products"
        user={user}
        isAdmin={isAdmin}
        navigate={navigate}
        onLogout={handleLogout}
      />

      <main style={styles.main} className="renova-products-main renova-form-main">
        <header className="renova-products-header">
          <div>
            <span className="renova-section-badge renova-form-badge">Editar producto</span>

            <h1>Actualizar producto</h1>

            <p>
              Modificá los datos del producto publicado para mantener la
              información actualizada.
            </p>
          </div>

          <div className="renova-header-actions">
            <HeaderUserCard user={user} />
          </div>
        </header>

        <section style={styles.formPanel} className="renova-form-panel">
          <div style={styles.formHeader}>
            <div>
              <h2 style={styles.formTitle}>Información del producto</h2>
              <p style={styles.formDescription}>
                Revisá y actualizá los datos principales del producto.
              </p>
            </div>

            <div style={styles.formIcon} className="renova-form-icon">
              <UiIcon name="edit" size={28} />
            </div>
          </div>

          {error && <div style={styles.errorBox} className="renova-form-error">{error}</div>}
          {success && <div style={styles.successBox} className="renova-form-success">{success}</div>}

          {loading ? (
            <p style={styles.loadingText}>Cargando producto...</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Nombre del producto</label>
                  <input
                    style={styles.input}
                    type="text"
                    name="name"
                    placeholder="Ej: Fideos secos"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Categoría</label>
                  <CategorySelect
                    style={styles.input}
                    categories={categories}
                    value={formData.category}
                    onChange={handleChange}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Cantidad</label>
                  <input
                    style={styles.input}
                    type="number"
                    name="quantity"
                    min="0"
                    placeholder="Ej: 10"
                    value={formData.quantity}
                    onChange={handleChange}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Unidad</label>
                  <input
                    style={styles.input}
                    type="text"
                    name="unit"
                    placeholder="Ej: unidades, kg, cajas"
                    value={formData.unit}
                    onChange={handleChange}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Fecha de vencimiento</label>
                  <input
                    style={styles.input}
                    type="date"
                    name="expiration_date"
                    value={formData.expiration_date}
                    onChange={handleChange}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Estado</label>
                  <select
                    style={styles.input}
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option
                      value="AVAILABLE"
                      disabled={Number(formData.quantity) === 0}
                    >
                      Disponible
                    </option>
                    <option value="UNAVAILABLE">No disponible</option>
                  </select>
                  {Number(formData.quantity) === 0 && formData.quantity !== "" && (
                    <small style={{ display: "block", marginTop: "6px", color: "#5d6b60", fontSize: "0.82rem" }} className="renova-form-hint">
                      Sin stock el producto queda como no disponible.
                    </small>
                  )}
                </div>

                <label style={styles.checkboxCard} className="renova-form-checkbox-card">
                  <input
                    type="checkbox"
                    name="low_rotation"
                    checked={formData.low_rotation}
                    onChange={handleChange}
                    style={styles.checkbox}
                  />

                  <div>
                    <strong style={styles.checkboxTitle}>
                      Producto de baja rotación
                    </strong>
                    <p style={styles.checkboxText}>
                      Marcá esta opción si el producto tiene baja salida o poca
                      demanda comercial.
                    </p>
                  </div>
                </label>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Descripción</label>
                <textarea
                  style={styles.textarea}
                  name="description"
                  placeholder="Agregá detalles del producto, estado, condiciones de retiro u observaciones."
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              <div style={styles.formActions}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  className="renova-form-secondary"
                  onClick={() => navigate("/products")}
                >
                  Cancelar
                </button>

                <button type="submit" style={styles.primaryButton} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

const styles = {
  ...pageStyles,

  formPanel: {
    maxWidth: "980px",
    background: "#ffffff",
    border: "1px solid #e1eadc",
    borderRadius: "24px",
    padding: "34px",
    boxShadow: "0 18px 45px rgba(31,77,28,0.07)",
  },

  formHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "24px",
    marginBottom: "28px",
  },

  formTitle: {
    margin: "0 0 10px",
    color: "#102018",
    fontSize: "1.7rem",
    letterSpacing: "-0.4px",
  },

  formDescription: {
    margin: 0,
    color: "#607064",
    fontSize: "1rem",
    lineHeight: 1.6,
  },

  formIcon: {
    width: "64px",
    height: "64px",
    borderRadius: "16px",
    background: "#e8f4df",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#1f8b24",
    flexShrink: 0,
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "20px",
  },

  textarea: {
    width: "100%",
    minHeight: "130px",
    border: "1.5px solid #d9e5d4",
    borderRadius: "16px",
    padding: "16px",
    fontSize: "1rem",
    outline: "none",
    resize: "vertical",
    color: "#102018",
  },

  checkboxCard: {
    minHeight: "82px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    background: "#f7faf4",
    border: "1px solid #e6efdf",
    borderRadius: "16px",
    padding: "16px",
    cursor: "pointer",
  },

  checkbox: {
    width: "20px",
    height: "20px",
    accentColor: "#2f9728",
    flexShrink: 0,
  },

  checkboxTitle: {
    display: "block",
    color: "#102018",
    fontSize: "0.98rem",
    fontWeight: 900,
    marginBottom: "4px",
  },

  checkboxText: {
    margin: 0,
    color: "#607064",
    fontSize: "0.9rem",
    lineHeight: 1.45,
  },

  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "26px",
  },

  loadingText: {
    margin: 0,
    color: "#607064",
    fontSize: "1rem",
  },
};

export default EditProduct;



