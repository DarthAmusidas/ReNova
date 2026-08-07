import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../services/authService";
import renovaLogo from "../assets/renova-logo-login.png";
import AuthHero from "../components/AuthHero";
import "../styles/auth-final.css";

const organizationTypes = [
  "Comedor",
  "Merendero",
  "Voluntariado",
  "Supermercado",
  "Almacen",
  "Verduleria",
  "Ferreteria",
];

function FieldIcon({ type }) {
  const paths = {
    building: (
      <>
        <path d="M5 21V6h10v15" />
        <path d="M9 6V3h6v18" />
        <path d="M15 10h4v11" />
        <path d="M8 10h2M8 14h2M8 18h2" />
      </>
    ),

    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c.5-4.3 3.3-7 8-7s7.5 2.7 8 7" />
      </>
    ),

    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),

    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),

    phone: (
      <path d="M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4c0 1.1-.9 2-2 2C10.2 21 3 13.8 3 5c0-1.1.9-2 2-2Z" />
    ),

    location: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[type]}
    </svg>
  );
}

function EyeIcon({ hidden }) {
  if (hidden) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.8 4.3A10.3 10.3 0 0 1 12 4c5.7 0 9 5.5 9 5.5a15 15 0 0 1-2.2 2.8" />
        <path d="M6.5 6.5C4.2 8 3 9.5 3 9.5S6.3 15 12 15c1 0 2-.2 2.9-.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.6-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.6 5.5-9.5 5.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    organization_type: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const data = await register(formData);

      setSuccess(
        data.message ||
          "Cuenta creada correctamente. Revisá tu email para verificar la cuenta antes de iniciar sesión."
      );
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Error al crear la cuenta"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page-modern auth-final-page register-page-modern">
      <AuthHero />

      <section className="login-right-modern">
        <div className="login-auth-area">

          <div className="login-card-modern register-card-modern auth-register-card">

            <img
              className="login-card-logo"
              src={renovaLogo}
              alt="ReNova"
            />

            <h2>Crear cuenta</h2>

            <p>
              Completá tus datos para registrarte en ReNova.
              Luego vas a recibir un email para verificar tu cuenta.
            </p>

            {error && (
              <div className="error-message-modern">
                {error}
              </div>
            )}

            {success && (
              <div className="success-message-modern">
                {success}

                <small>
                  Revisá tu bandeja de entrada o spam.
                  El acceso se habilita después de verificar el email.
                </small>
              </div>
            )}

            <form onSubmit={handleSubmit}>

              <div className="input-group-modern">
                <label htmlFor="organization_type">
                  Tipo de organización
                </label>

                <div className="input-with-icon">
                  <span className="auth-field-icon">
                    <FieldIcon type="building" />
                  </span>

                  <select
                    id="organization_type"
                    name="organization_type"
                    value={formData.organization_type}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  >
                    <option value="" disabled>
                      Seleccioná un tipo
                    </option>

                    {organizationTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group-modern">
                <label htmlFor="name">
                  Nombre
                </label>

                <div className="input-with-icon">
                  <span className="auth-field-icon">
                    <FieldIcon type="user" />
                  </span>

                  <input
                    id="name"
                    type="text"
                    name="name"
                    placeholder="Nombre de la organización"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="input-group-modern">
                <label htmlFor="email">
                  Email
                </label>

                <div className="input-with-icon">
                  <span className="auth-field-icon">
                    <FieldIcon type="mail" />
                  </span>

                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="correo@ejemplo.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="input-group-modern">
                <label htmlFor="password">
                  Contraseña
                </label>

                <div className="input-with-icon">
                  <span className="auth-field-icon">
                    <FieldIcon type="lock" />
                  </span>

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    minLength={6}
                    required
                  />

                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    aria-label={
                      showPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >
                    <EyeIcon hidden={showPassword} />
                  </button>
                </div>
              </div>

              <div className="form-grid-modern register-form-grid">

                <div className="input-group-modern">
                  <label htmlFor="phone">
                    Teléfono
                    <span className="field-optional">
                      {" "}(opcional)
                    </span>
                  </label>

                  <div className="input-with-icon">
                    <span className="auth-field-icon">
                      <FieldIcon type="phone" />
                    </span>

                    <input
                      id="phone"
                      type="text"
                      name="phone"
                      placeholder="Ej: 351..."
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="input-group-modern">
                  <label htmlFor="address">
                    Dirección
                    <span className="field-optional">
                      {" "}(opcional)
                    </span>
                  </label>

                  <div className="input-with-icon">
                    <span className="auth-field-icon">
                      <FieldIcon type="location" />
                    </span>

                    <input
                      id="address"
                      type="text"
                      name="address"
                      placeholder="Dirección"
                      value={formData.address}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                </div>

              </div>

              <button
                className="btn-login-modern auth-submit-button"
                type="submit"
                disabled={loading}
              >
                {loading && (
                  <span
                    className="auth-button-spinner"
                    aria-hidden="true"
                  />
                )}

                {loading
                  ? "Creando cuenta..."
                  : "Crear cuenta"}
              </button>

            </form>

            <div className="login-separator">
              <span />
              <p>o</p>
              <span />
            </div>

            <div className="login-register-text">
              ¿Ya tenés cuenta?

              <button
                type="button"
                onClick={() =>
                  navigate("/login")
                }
              >
                Iniciar sesión
              </button>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}

export default Register;
