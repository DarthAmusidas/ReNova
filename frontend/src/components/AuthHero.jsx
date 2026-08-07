import renovaLogo from "../assets/renova-logo-login.png";
import groceryBag from "../assets/login-grocery-bag-transparent.png";

function BenefitIcon({ type }) {
  if (type === "leaf") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.5 4.5C12 4.8 7.5 8.3 7.5 13.1c0 1 .2 1.9.6 2.7C6 17.2 4.7 19 4 20.5" />
        <path d="M8.3 15.4c2.5-2.7 5.6-5 9.8-7.1" />
      </svg>
    );
  }

  if (type === "community") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="8" cy="8" r="3" />
        <circle cx="16" cy="8" r="3" />
        <path d="M2.8 19c.4-3.5 2.4-5.5 5.2-5.5s4.8 2 5.2 5.5" />
        <path d="M11.5 15.2c1-1.1 2.5-1.7 4.5-1.7 2.8 0 4.8 2 5.2 5.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20.5S4.5 16 4.5 10.2A4.7 4.7 0 0 1 12 6.5a4.7 4.7 0 0 1 7.5 3.7C19.5 16 12 20.5 12 20.5Z" />
    </svg>
  );
}

function AuthHero() {
  return (
    <section className="login-left-modern">
      <div className="login-hero">
        <div className="login-hero-content">

          <div className="login-brand-block">
            <img
              className="login-main-logo"
              src={renovaLogo}
              alt="ReNova"
            />

            <span className="login-badge">
              ♡ Plataforma solidaria
            </span>
          </div>

          <div className="login-hero-copy">
            <h1 className="login-title">
              Conectamos para
              <span className="login-title-accent">
                {" "}compartir
              </span>
            </h1>

            <p className="login-description">
              ReNova conecta supermercados y organizaciones sociales para
              facilitar la donación de productos disponibles y generar impacto
              positivo en la comunidad.
            </p>
          </div>

          <div className="login-benefits">

            <div className="login-benefit-card">
              <div className="benefit-icon benefit-icon-leaf">
                <BenefitIcon type="leaf" />
              </div>

              <div>
                <strong>Menos desperdicio</strong>
                <p>Más impacto</p>
              </div>
            </div>

            <div className="login-benefit-card">
              <div className="benefit-icon benefit-icon-community">
                <BenefitIcon type="community" />
              </div>

              <div>
                <strong>Más comunidad</strong>
                <p>Más colaboración</p>
              </div>
            </div>

            <div className="login-benefit-card">
              <div className="benefit-icon benefit-icon-heart">
                <BenefitIcon type="heart" />
              </div>

              <div>
                <strong>Más solidaridad</strong>
                <p>Más futuro</p>
              </div>
            </div>

          </div>
        </div>

        <div
          className="login-illustration-wrap"
          aria-hidden="true"
        >
          <img
            className="login-grocery-image"
            src={groceryBag}
            alt=""
          />
        </div>
      </div>
    </section>
  );
}

export default AuthHero;
