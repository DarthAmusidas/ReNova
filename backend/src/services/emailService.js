const dns = require("dns");
const nodemailer = require("nodemailer");

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

const dnsPromises = dns.promises;

function getFrontendUrl() {
  return process.env.FRONTEND_URL || "http://localhost:5173";
}

function buildFrontendLink(path, token) {
  const frontendUrl = getFrontendUrl().replace(/\/$/, "");
  return `${frontendUrl}${path}?token=${encodeURIComponent(token)}`;
}

async function resolveSmtpHost() {
  const host = process.env.SMTP_HOST;

  if (!host) {
    return null;
  }

  try {
    const addresses = await dnsPromises.resolve4(host);

    if (addresses && addresses.length > 0) {
      console.log(`SMTP IPv4 resolved: ${host} -> ${addresses[0]}`);
      return addresses[0];
    }
  } catch (error) {
    console.warn(`No se pudo resolver SMTP por IPv4, usando host original: ${error.message}`);
  }

  return host;
}

async function createTransporter() {
  const smtpHost = process.env.SMTP_HOST;

  if (!smtpHost) {
    return null;
  }

  const resolvedHost = await resolveSmtpHost();

  return nodemailer.createTransport({
    host: resolvedHost,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      servername: smtpHost,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    dnsTimeout: 10000,
  });
}

async function sendMail({ to, subject, text, html }) {
  const transporter = await createTransporter();

  if (!transporter) {
    console.log("================ EMAIL MOCK ================");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log(text);
    console.log("===========================================");
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
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
