const getFrontendUrl = () =>
  process.env.FRONTEND_URL || "http://localhost:5173";

const getFromAddress = () =>
  process.env.SMTP_FROM || "ReNova <no-reply@renova.com>";

const buildFrontendLink = (path, token) => {
  const baseUrl = getFrontendUrl().replace(/\/$/, "");
  return `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
};

const getTransporter = () => {
  if (!process.env.SMTP_HOST) {
    return null;
  }

  const nodemailer = require("nodemailer");

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.log("\n================ EMAIL MOCK ================");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log(text);
    console.log("===========================================\n");

    return {
      sent: false,
      mock: true,
    };
  }

  await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
    text,
  });

  return {
    sent: true,
    mock: false,
  };
};

const sendVerificationEmail = async ({ to, name, token }) => {
  const verificationLink = buildFrontendLink("/verify-email", token);

  return sendEmail({
    to,
    subject: "Verificá tu email en ReNova",
    text: `Hola ${name || ""}. Verificá tu email ingresando a este link: ${verificationLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Verificá tu email en ReNova</h2>
        <p>Hola ${name || ""}, gracias por registrarte en ReNova.</p>
        <p>Para activar tu cuenta, ingresá al siguiente enlace:</p>
        <p>
          <a href="${verificationLink}" style="display:inline-block;padding:12px 18px;background:#16831e;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;">
            Verificar email
          </a>
        </p>
        <p>Este enlace vence en 24 horas.</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async ({ to, name, token }) => {
  const resetLink = buildFrontendLink("/reset-password", token);

  return sendEmail({
    to,
    subject: "Recuperá tu contraseña de ReNova",
    text: `Hola ${name || ""}. Para recuperar tu contraseña ingresá a este link: ${resetLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Recuperá tu contraseña</h2>
        <p>Hola ${name || ""}, recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Ingresá al siguiente enlace para definir una nueva contraseña:</p>
        <p>
          <a href="${resetLink}" style="display:inline-block;padding:12px 18px;background:#16831e;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;">
            Restablecer contraseña
          </a>
        </p>
        <p>Este enlace vence en 30 minutos.</p>
        <p>Si no solicitaste este cambio, podés ignorar este mensaje.</p>
      </div>
    `,
  });
};

module.exports = {
  buildFrontendLink,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
