import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../services/authService";
import renovaLogo from "../assets/renova-logo-login.png";

function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verificando tu email...");

  useEffect(() => {
    const runVerification = async () => {
      if (!token) {
        setStatus("error");
        setMessage("El enlace de verificación no tiene token.");
        return;
      }

      try {
        const data = await verifyEmail(token);

        setStatus("success");
        setMessage(data.message || "Email verificado correctamente.");
      } catch (err) {
        setStatus("error");
        setMessage(
          err.response?.data?.error ||
            "No pudimos verificar el email. El enlace puede estar vencido."
        );
      }
    };

    runVerification();
  }, [token]);

  return (
    <main className="login-page-modern auth-recovery-page">
      <div className="leaf-shape leaf-shape-one" />
      <div className="leaf-shape leaf-shape-two" />

      <section className="login-right-modern auth-recovery-center">
        <div className="login-auth-area">
          <div className="login-card-modern auth-recovery-card">
            <img className="login-card-logo" src={renovaLogo} alt="ReNova" />

            <h2>Verificación de email</h2>

            <p>
              Validamos tu dirección de correo para activar correctamente tu
              cuenta en ReNova.
            </p>

            {status === "loading" && (
              <div className="success-message-modern">{message}</div>
            )}

            {status === "success" && (
              <div className="success-message-modern">{message}</div>
            )}

            {status === "error" && (
              <div className="error-message-modern">{message}</div>
            )}

            <button
              className="btn-login-modern"
              type="button"
              onClick={() => navigate("/login")}
            >
              Ir al login
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default VerifyEmail;
