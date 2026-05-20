import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("supertest@renova.com");
  const [password, setPassword] = useState("supertest123");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const data = await login(email, password);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Error al iniciar sesión");
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
          Conectamos para <br />
          <span>compartir</span>
        </h2>

        <div className="green-line"></div>

        <p className="login-main-text">
          ReNova conecta supermercados y organizaciones sociales para facilitar
          la donación de productos disponibles y generar impacto positivo en la
          comunidad.
        </p>

        <div className="login-benefits">
          <div className="benefit-item">
            <div className="benefit-icon">🍃</div>
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
        <div className="login-card-modern">
          <div className="login-lock-icon">🔒</div>

          <h2>Iniciar sesión</h2>
          <p>Ingresá con tu cuenta para acceder al panel de gestión.</p>

          <form onSubmit={handleLogin}>
            <div className="input-group-modern">
              <label>Email</label>
              <div className="input-with-icon">
                <span>✉</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="usuario@renova.com"
                />
              </div>
            </div>

            <div className="input-group-modern">
              <label>Contraseña</label>
              <div className="input-with-icon">
                <span>🔐</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="Ingresá tu contraseña"
                />
              </div>
            </div>

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" defaultChecked />
                Recordarme
              </label>

              <button type="button" className="forgot-link">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && <div className="error-message-modern">{error}</div>}

            <button className="btn-login-modern" type="submit">
              Ingresar
            </button>
          </form>

          <div className="login-separator">
            <span></span>
            <p>o</p>
            <span></span>
          </div>

          <div className="login-register-text">
            ¿No tenés cuenta? <button type="button">Registrate</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Login;