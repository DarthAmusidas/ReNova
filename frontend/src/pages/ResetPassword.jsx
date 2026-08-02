import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../services/authService";
import renovaLogo from "../assets/renova-logo-login.png";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!token) {
      setError("El enlace de recuperación no tiene token.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const data = await resetPassword({
        token,
        password,
      });

      setMessage(data.message || "Contraseña actualizada correctamente.");

      setTimeout(() => {
        navigate("/login");
      }, 1400);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "No pudimos actualizar la contraseña. El enlace puede estar vencido."
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

            <h2>Nueva contraseña</h2>

            <p>
              Definí una nueva contraseña para recuperar el acceso a tu cuenta.
            </p>

            {!token && (
              <div className="error-message-modern">
                El enlace no contiene un token válido.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="input-group-modern">
                <label htmlFor="new-password">Nueva contraseña</label>

                <div className="input-with-icon">
                  <span>{"\uD83D\uDD10"}</span>

                  <input
                    id="new-password"
                    type="password"
                    value={password}
                    placeholder="Mínimo 6 caracteres"
                    disabled={loading || !token}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </div>

              <div className="input-group-modern">
                <label htmlFor="confirm-password">Confirmar contraseña</label>

                <div className="input-with-icon">
                  <span>{"\uD83D\uDD10"}</span>

                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    placeholder="Repetí la contraseña"
                    disabled={loading || !token}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
              </div>

              {message && (
                <div className="success-message-modern">{message}</div>
              )}

              {error && <div className="error-message-modern">{error}</div>}

              <button
                className="btn-login-modern"
                type="submit"
                disabled={loading || !token}
              >
                {loading ? "Actualizando..." : "Actualizar contraseña"}
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

export default ResetPassword;
