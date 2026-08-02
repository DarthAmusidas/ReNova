const dns = require("dns");
const nodemailer = require("nodemailer");

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || "http://localhost:5173";
}

function buildFrontendLink(path, token) {
  const frontendUrl = getFrontendUrl().replace(/\/$/, "");
  return `${frontendUrl}${path}?token=${encodeURIComponent(token)}`;
}

function createTransporter() {
  if (!process.env.SMTP_HOST) {
    return null;
  }

  console.log("[smtp] creating transporter", {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    user: process.env.SMTP_USER,
    family: 4,
  });

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    family: 4,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });
}

async function sendMail({ to, subject, text, html }) {
  const transporter = createTransporter();

  if (!transporter) {
    console.log("================ EMAIL MOCK ================");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log(text);
    console.log("===========================================");
    return;
  }

  console.log("[smtp] sending mail to", to);

  await Promise.race([
    transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("SMTP timeout after 10 seconds")), 10000)
    ),
  ]);

  console.log("[smtp] mail sent to", to);
}

async function sendVerificationEmail({ to, name, token }) {
  const link = buildFrontendLink("/verify-email", token);

  await sendMail({
    to,
    subject: "Verificá tu cuenta de ReNova",
    text: `Hola ${name || ""}. Verificá tu cuenta entrando a este enlace: ${link}`,
    html: `
      <p>Hola ${name || ""},</p>
      <p>Para verificar tu cuenta de ReNova, ingresá al siguiente enlace:</p>
      <p><a href="${link}">${link}</a></p>
    `,
  });
}

async function sendPasswordResetEmail({ to, name, token }) {
  const link = buildFrontendLink("/reset-password", token);

  await sendMail({
    to,
    subject: "Recuperar contraseña de ReNova",
    text: `Hola ${name || ""}. Para recuperar tu contraseña, ingresá a este enlace: ${link}`,
    html: `
      <p>Hola ${name || ""},</p>
      <p>Recibimos una solicitud para recuperar tu contraseña de ReNova.</p>
      <p>Ingresá al siguiente enlace para crear una nueva contraseña:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Si no solicitaste este cambio, podés ignorar este correo.</p>
    `,
  });
}

module.exports = {
  buildFrontendLink,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
