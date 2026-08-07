const dns = require("dns");
const nodemailer = require("nodemailer");
const { Resend } = require("resend");

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

function getEmailFrom() {
  return (
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    "ReNova <onboarding@resend.dev>"
  );
}

async function sendMailWithResend({ to, subject, text, html }) {
  if (!process.env.RESEND_API_KEY) {
    return false;
  }

  console.log("[email] provider=resend");
  console.log("[email] sending to", to);

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: getEmailFrom(),
    to,
    subject,
    text,
    html,
  });

  if (error) {
    throw new Error(
      `Resend error: ${error.message || JSON.stringify(error)}`
    );
  }

  console.log("[email] resend sent", data?.id || data);
  return true;
}

function createSmtpTransporter() {
  if (!process.env.SMTP_HOST) {
    return null;
  }

  console.log("[email] provider=smtp", {
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

async function sendMailWithSmtp({ to, subject, text, html }) {
  const transporter = createSmtpTransporter();

  if (!transporter) {
    return false;
  }

  console.log("[email] sending smtp mail to", to);

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

  console.log("[email] smtp mail sent to", to);
  return true;
}

async function sendMail({ to, subject, text, html }) {
  if (process.env.RESEND_API_KEY) {
    await sendMailWithResend({ to, subject, text, html });
    return;
  }

  const smtpSent = await sendMailWithSmtp({ to, subject, text, html });

  if (smtpSent) {
    return;
  }

  console.log("================ EMAIL MOCK ================");
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log(text);
  console.log("===========================================");
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
