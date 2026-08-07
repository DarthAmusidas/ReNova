import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../services/authService";
import renovaLogo from "../assets/renova-logo-login.png";

const organizationTypes = [
  "Comedor",
  "Merendero",
  "Voluntariado",
  "Supermercado",
  "AlmacÃ©n",
  "VerdulerÃ­a",
  "FerreterÃ­a",
];

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

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    try {
      await register(formData);

      setSuccess("Cuenta creada correctamente. Ya podÃ©s iniciar sesiÃ³n.");

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
          <img className="login-brand-logo" src={renovaLogo} alt="ReNova" />
        </div>

        <span className="green-badge">â™¡ Plataforma solidaria</span>

        <h2 className="login-main-title">
          Sumate para <span>compartir</span>
        </h2>

        <div className="green-line"></div>

        <p className="login-main-text">
          RegistrÃ¡ tu organizaciÃ³n o supermercado para participar en la red de
          donaciÃ³n de productos disponibles y generar impacto positivo en la
          comunidad.
        </p>

        <div className="login-benefits">
          <div className="benefit-item">
            <div className="benefit-icon">ðŸ¥¬</div>
            <div>
              <strong>Menos desperdicio</strong>
              <p>MÃ¡s impacto</p>
            </div>
          </div>

          <div className="benefit-item">
            <div className="benefit-icon">ðŸ‘¥</div>
            <div>
              <strong>MÃ¡s comunidad</strong>
              <p>MÃ¡s colaboraciÃ³n</p>
            </div>
          </div>

          <div className="benefit-item">
            <div className="benefit-icon">â™¡</div>
            <div>
              <strong>MÃ¡s solidaridad</strong>
              <p>MÃ¡s futuro</p>
            </div>
          </div>
        </div>

        <div className="food-illustration">
          <div className="food-crate">
            <div className="vegetables">
              <span>ðŸ¥¬</span>
              <span>ðŸ¥¦</span>
              <span>ðŸ…</span>
              <span>ðŸ¥•</span>
              <span>ðŸ¥’</span>
            </div>

            <div className="crate-box">
              <span>ReNova</span>
            </div>
          </div>
        </div>
      </section>

      <section className="login-right-modern">
        <div className="login-card-modern register-card-modern">
          <div className="login-lock-icon">ðŸ“</div>
          <img className="login-card-logo" src={renovaLogo} alt="ReNova" />

          <h2>Crear cuenta</h2>

          <p>
            CompletÃ¡ tus datos para registrarte en la plataforma y comenzar a
            utilizar ReNova.
          </p>

          {error && <div className="error-message-modern">{error}</div>}
          {success && <div className="success-message-modern">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="input-group-modern">
              <label>Tipo de organizaciÃ³n</label>
              <div className="input-with-icon">
                <span>ðŸ·ï¸</span>
                <select
                  name="organization_type"
                  value={formData.organization_type}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled>
                    SeleccionÃ¡ un tipo
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
              <label>Nombre</label>
              <div className="input-with-icon">
                <span>ðŸ‘¤</span>
                <input
                  type="text"
                  name="name"
                  placeholder="Nombre de la organizaciÃ³n"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="input-group-modern">
              <label>Email</label>
              <div className="input-with-icon">
                <span>âœ‰ï¸</span>
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
              <label>ContraseÃ±a</label>
              <div className="input-with-icon">
                <span>ðŸ”’</span>
                <input
                  type="password"
                  name="password"
                  placeholder="IngresÃ¡ una contraseÃ±a"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-grid-modern register-form-grid">
              <div className="input-group-modern">
                <label>TelÃ©fono</label>
                <div className="input-with-icon">
                  <span>ðŸ“ž</span>
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
                <label>DirecciÃ³n</label>
                <div className="input-with-icon">
                  <span>ðŸ“</span>
                  <input
                    type="text"
                    name="address"
                    placeholder="DirecciÃ³n"
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
            Â¿Ya tenÃ©s cuenta?
            <button type="button" onClick={() => navigate("/login")}>
              IniciÃ¡ sesiÃ³n
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Register;

