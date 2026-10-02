// Token corto y firmado para el QR de retiro.
// Formato: <id de reserva en base64url>.<vencimiento en base36>.<firma>
// No se guarda en la base: vence solo y deja de servir cuando la reserva se
// completa. Es corto para que el QR sea simple y se lea bien desde una pantalla.
const crypto = require("crypto");

const PICKUP_TOKEN_MINUTES = 10;

const getSecret = () => {
  const secret = process.env.PICKUP_TOKEN_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Falta JWT_SECRET para firmar el QR de retiro");
  }

  return secret;
};

const sign = (payload) =>
  crypto
    .createHmac("sha256", getSecret())
    .update(`pickup:${payload}`)
    .digest("base64url")
    .slice(0, 22);

const uuidToBase64Url = (uuid) =>
  Buffer.from(String(uuid).replace(/-/g, ""), "hex").toString("base64url");

const base64UrlToUuid = (value) => {
  const hex = Buffer.from(value, "base64url").toString("hex");

  if (hex.length !== 32) return null;

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const createPickupToken = (reservationId) => {
  const expiresAt = new Date(Date.now() + PICKUP_TOKEN_MINUTES * 60 * 1000);
  const expiresInSeconds = Math.floor(expiresAt.getTime() / 1000).toString(36);
  const payload = `${uuidToBase64Url(reservationId)}.${expiresInSeconds}`;

  return {
    token: `${payload}.${sign(payload)}`,
    expiresAt,
  };
};

// Devuelve { reservationId, expiresAt } o un motivo de error.
const verifyPickupToken = (token) => {
  const parts = String(token || "").split(".");

  if (parts.length !== 3) return { error: "invalid" };

  const [encodedId, encodedExpiration, signature] = parts;
  const expected = sign(`${encodedId}.${encodedExpiration}`);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return { error: "invalid" };
  }

  const reservationId = base64UrlToUuid(encodedId);
  const expiresAt = new Date(parseInt(encodedExpiration, 36) * 1000);

  if (!reservationId || Number.isNaN(expiresAt.getTime())) {
    return { error: "invalid" };
  }

  if (Date.now() > expiresAt.getTime()) {
    return { error: "expired", reservationId, expiresAt };
  }

  return { reservationId, expiresAt };
};

module.exports = {
  PICKUP_TOKEN_MINUTES,
  createPickupToken,
  verifyPickupToken,
};
