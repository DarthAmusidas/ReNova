import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import renovaLogo from "../assets/renova-logo-login.png";
import AuthHero from "../components/AuthHero";
import "../styles/auth-final.css";

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

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await login({
        email,
        password,
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Error al iniciar sesión"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page-modern auth-final-page">
      <AuthHero />

      <section className="login-right-modern">
        <div className="login-auth-area">

          <div className="login-card-modern auth-login-card">

            <img
              className="login-card-logo"
              src={renovaLogo}
              alt="ReNova"
            />

            <h2>Iniciar sesión</h2>

            <p>
              Ingresá con tu cuenta para acceder al panel de gestión.
            </p>

            <form onSubmit={handleLogin}>

              <div className="input-group-modern">
                <label htmlFor="login-email">
                  Email
                </label>

                <div className="input-with-icon">
                  <span className="auth-field-icon">
                    <MailIcon />
                  </span>

                  <input
                    id="login-email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    type="email"
                    placeholder="Ingresá tu email"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="input-group-modern">
                <label htmlFor="login-password">
                  Contraseña
                </label>

                <div className="input-with-icon auth-password-field">

                  <input
                    id="login-password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresá tu contraseña"
                    disabled={loading}
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

              <div className="login-options">

                <label className="remember-me">
                  <input type="checkbox" defaultChecked />
                  Recordarme
                </label>

                <button
                  type="button"
                  className="forgot-link"
                  onClick={() =>
                    navigate("/forgot-password")
                  }
                >
                  ¿Olvidaste tu contraseña?
                </button>

              </div>

              {error && (
                <div className="error-message-modern">
                  {error}
                </div>
              )}

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
                  ? "Ingresando..."
                  : "Ingresar"}
              </button>

            </form>

            <div className="login-separator">
              <span />
              <p>o</p>
              <span />
            </div>

            <div className="login-register-text">
              ¿No tenés cuenta?

              <button
                type="button"
                onClick={() =>
                  navigate("/register")
                }
              >
                Registrate
              </button>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}

export default Login;
