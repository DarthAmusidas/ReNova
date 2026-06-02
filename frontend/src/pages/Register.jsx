import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../services/authService";


function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    organization_type: "Comedor",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleRoleChange = (role) => {
    setFormData((currentData) => ({
      ...currentData,
      organization_type: role,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    try {
      await register(formData);

      setSuccess("Cuenta creada correctamente. Ya podés iniciar sesión.");

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Error al crear la cuenta"
      );
    }
  };

  return (
    <div className="login-page-modern">
      <div className="leaf-shape leaf-shape-one"></div>
      <div className="leaf-shape leaf-shape-two"></div>

      <section className="login-left-modern">
        <div className="login-brand-modern">
          <div className="brand-leaf">🌱</div>
          <h1>ReNova</h1>
        </div>

        <span className="green-badge">♡ Plataforma solidaria</span>

        <h2 className="login-main-title">
          Sumate para <span>compartir</span>
        </h2>

        <div className="green-line"></div>

        <p className="login-main-text">
          Registrá tu organización o supermercado para participar en la red de
          donación de productos disponibles y generar impacto positivo en la
          comunidad.
        </p>

        <div className="login-benefits">
          <div className="benefit-item">
            <div className="benefit-icon">🥬</div>
            <div>
              <strong>Menos desperdicio</strong>
              <p>Más impacto</p>
            </div>
          </div>

          <div className="benefit-item">
            <div className="benefit-icon">👥</div>
            <div>
              <strong>Más comunidad</strong>
              <p>Más colaboración</p>
            </div>
          </div>

          <div className="benefit-item">
            <div className="benefit-icon">♡</div>
            <div>
              <strong>Más solidaridad</strong>
              <p>Más futuro</p>
            </div>
          </div>
        </div>

        <div className="food-illustration">
          <div className="food-crate">
            <div className="vegetables">
              <span>🥬</span>
              <span>🥦</span>
              <span>🍅</span>
              <span>🥕</span>
              <span>🥒</span>
            </div>

            <div className="crate-box">
              <span>ReNova</span>
            </div>
          </div>
        </div>
      </section>

      <section className="login-right-modern">
        <div className="login-card-modern register-card-modern">
          <div className="login-lock-icon">📝</div>

          <h2>Crear cuenta</h2>

          <p>
            Completá tus datos para registrarte en la plataforma y comenzar a
            utilizar ReNova.
          </p>

          {error && <div className="error-message-modern">{error}</div>}
          {success && <div className="success-message-modern">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="register-role-grid">
              <button
                type="button"
                className={`role-option-card ${
                  formData.organization_type === "Comedor" ? "active" : ""
                }`}
                onClick={() => handleRoleChange("Comedor")}
              >
                <span>🍽️</span>
                <strong>Comedor</strong>
              </button>

              <button
                type="button"
                className={`role-option-card ${
                  formData.organization_type === "Merendero" ? "active" : ""
                }`}
                onClick={() => handleRoleChange("Merendero")}
              >
                <span>🥗</span>
                <strong>Merendero</strong>
              </button>

              <button
                type="button"
                className={`role-option-card ${
                  formData.organization_type === "Voluntariado" ? "active" : ""
                }`}
                onClick={() => handleRoleChange("Voluntariado")}
              >
                <span>🤲</span>
                <strong>Voluntariado</strong>
              </button>

              <button
                type="button"
                className={`role-option-card ${
                  formData.organization_type === "Supermercado" ? "active" : ""
                }`}
                onClick={() => handleRoleChange("Supermercado")}
              >
                <span>🛒</span>
                <strong>Supermercado</strong>
              </button>

              <button
                type="button"
                className={`role-option-card ${
                  formData.organization_type === "Almacén" ? "active" : ""
                }`}
                onClick={() => handleRoleChange("Almacén")}
              >
                <span>📦</span>
                <strong>Almacén</strong>
              </button>

              <button
                type="button"
                className={`role-option-card ${
                  formData.organization_type === "Verdulería" ? "active" : ""
                }`}
                onClick={() => handleRoleChange("Verdulería")}
              >
                <span>🥬</span>
                <strong>Verdulería</strong>
              </button>

              <button
                type="button"
                className={`role-option-card ${
                  formData.organization_type === "Ferretería" ? "active" : ""
                }`}
                onClick={() => handleRoleChange("Ferretería")}
              >
                <span>🔨</span>
                <strong>Ferretería</strong>
              </button>
            </div>

            <div className="input-group-modern">
              <label>Nombre</label>
              <div className="input-with-icon">
                <span>👤</span>
                <input
                  type="text"
                  name="name"
                  placeholder="Nombre de la organización"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="input-group-modern">
              <label>Email</label>
              <div className="input-with-icon">
                <span>✉️</span>
                <input
                  type="email"
                  name="email"
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="input-group-modern">
              <label>Contraseña</label>
              <div className="input-with-icon">
                <span>🔒</span>
                <input
                  type="password"
                  name="password"
                  placeholder="Ingresá una contraseña"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-grid-modern register-form-grid">
              <div className="input-group-modern">
                <label>Teléfono</label>
                <div className="input-with-icon">
                  <span>📞</span>
                  <input
                    type="text"
                    name="phone"
                    placeholder="Ej: 351..."
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="input-group-modern">
                <label>Dirección</label>
                <div className="input-with-icon">
                  <span>📍</span>
                  <input
                    type="text"
                    name="address"
                    placeholder="Dirección"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn-login-modern">
              Crear cuenta
            </button>
          </form>

          <div className="login-separator">
            <span></span>
            <p>o</p>
            <span></span>
          </div>

          <div className="login-register-text">
            ¿Ya tenés cuenta?
            <button type="button" onClick={() => navigate("/login")}>
              Iniciá sesión
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Register;