import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import renovaLogo from "../assets/renova-logo-login.png";
import groceryBag from "../assets/login-grocery-bag-transparent.png";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("supertest@renova.com");
  const [password, setPassword] = useState("supertest123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

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
      setError(err.response?.data?.error || "Error al iniciar sesi\u00f3n");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page-modern">
      <div className="leaf-shape leaf-shape-one" />
      <div className="leaf-shape leaf-shape-two" />

      <section className="login-left-modern">
        <div className="login-hero">
          <div className="login-hero-content">
            <div className="login-brand-block">
              <img className="login-main-logo" src={renovaLogo} alt="ReNova" />
              <span className="login-badge">&#9825; Plataforma solidaria</span>
            </div>

            <div className="login-hero-copy">
              <h1 className="login-title">
                Conectamos para
                <span className="login-title-accent"> compartir</span>
              </h1>

              <p className="login-description">
                ReNova conecta supermercados y organizaciones sociales para
                facilitar la donaci&oacute;n de productos disponibles y generar impacto
                positivo en la comunidad.
              </p>
            </div>

            <div className="login-benefits">
              <div className="login-benefit-card">
                <div className="benefit-icon">{"\uD83C\uDF3F"}</div>
                <div>
                  <strong>Menos desperdicio</strong>
                  <p>M&aacute;s impacto</p>
                </div>
              </div>

              <div className="login-benefit-card">
                <div className="benefit-icon">{"\uD83E\uDD1D"}</div>
                <div>
                  <strong>M&aacute;s comunidad</strong>
                  <p>M&aacute;s colaboraci&oacute;n</p>
                </div>
              </div>

              <div className="login-benefit-card">
                <div className="benefit-icon">{"\uD83D\uDC9A"}</div>
                <div>
                  <strong>M&aacute;s solidaridad</strong>
                  <p>M&aacute;s futuro</p>
                </div>
              </div>
            </div>
          </div>

          <div className="login-illustration-wrap" aria-hidden="true">
            <img className="login-grocery-image" src={groceryBag} alt="" />
          </div>
        </div>
      </section>

      <section className="login-right-modern">
        <div className="login-auth-area">
          <div className="login-card-modern">
            <img className="login-card-logo" src={renovaLogo} alt="ReNova" />

            <h2>Iniciar sesi&oacute;n</h2>
            <p>Ingres&aacute; con tu cuenta para acceder al panel de gesti&oacute;n.</p>

            <form onSubmit={handleLogin}>
              <div className="input-group-modern">
                <label htmlFor="login-email">Email</label>
                <div className="input-with-icon">
                  <span>{"\u2709"}</span>
                  <input
                    id="login-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="usuario@renova.com"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="input-group-modern">
                <label htmlFor="login-password">Contrase&ntilde;a</label>
                <div className="input-with-icon">
                  <span>{"\uD83D\uDD10"}</span>
                  <input
                    id="login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="Ingresa tu contrasena"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="login-options">
                <label className="remember-me">
                  <input type="checkbox" defaultChecked />
                  Recordarme
                </label>

                <button type="button" className="forgot-link">
                  &iquest;Olvidaste tu contrase&ntilde;a?
                </button>
              </div>

              {error && <div className="error-message-modern">{error}</div>}

              <button
                className="btn-login-modern"
                type="submit"
                disabled={loading}
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>

            <div className="login-separator">
              <span />
              <p>o</p>
              <span />
            </div>

            <div className="login-register-text">
              &iquest;No ten&eacute;s cuenta?
              <button type="button" onClick={() => navigate("/register")}>
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


