import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../services/authService";
import renovaLogo from "../assets/renova-logo-login.png";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const data = await forgotPassword(email);

      setMessage(
        data.message ||
          "Si el email existe, enviaremos un enlace para restablecer la contraseña."
      );
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "No pudimos procesar la solicitud. Intentá nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page-modern auth-recovery-page">
      <div className="leaf-shape leaf-shape-one" />
      <div className="leaf-shape leaf-shape-two" />

      <section className="login-right-modern auth-recovery-center">
        <div className="login-auth-area">
          <div className="login-card-modern auth-recovery-card">
            <img className="login-card-logo" src={renovaLogo} alt="ReNova" />

            <h2>Recuperar contraseña</h2>

            <p>
              Ingresá el email asociado a tu cuenta y te enviaremos un enlace
              para crear una nueva contraseña.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="input-group-modern">
                <label htmlFor="forgot-email">Email</label>

                <div className="input-with-icon">
                  <span>{"\u2709"}</span>

                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    placeholder="usuario@renova.com"
                    disabled={loading}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              {message && (
                <div className="success-message-modern">
                  {message}
                </div>
              )}

              {error && <div className="error-message-modern">{error}</div>}

              <button
                className="btn-login-modern"
                type="submit"
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar enlace"}
              </button>
            </form>

            <div className="login-register-text auth-secondary-action">
              <button type="button" onClick={() => navigate("/login")}>
                Volver al login
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ForgotPassword;
