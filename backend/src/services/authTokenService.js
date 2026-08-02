const crypto = require("crypto");

const TOKEN_TYPES = {
  EMAIL_VERIFICATION: "EMAIL_VERIFICATION",
  PASSWORD_RESET: "PASSWORD_RESET",
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const generateToken = () => crypto.randomBytes(32).toString("hex");

const createAuthToken = async ({
  pool,
  userId,
  type,
  expiresInMinutes,
}) => {
  const token = generateToken();
  const tokenHash = hashToken(token);

  await pool.query(
    `UPDATE auth_tokens
     SET used_at = NOW()
     WHERE user_id = $1
       AND type = $2
       AND used_at IS NULL`,
    [userId, type]
  );

  const result = await pool.query(
    `INSERT INTO auth_tokens
      (user_id, token_hash, type, expires_at)
     VALUES
      ($1, $2, $3, NOW() + ($4 || ' minutes')::interval)
     RETURNING id, expires_at`,
    [userId, tokenHash, type, String(expiresInMinutes)]
  );

  return {
    token,
    tokenHash,
    expiresAt: result.rows[0].expires_at,
  };
};

const findValidAuthToken = async ({ pool, token, type }) => {
  if (!token) return null;

  const tokenHash = hashToken(token);

  const result = await pool.query(
    `SELECT id, user_id, type, expires_at, used_at
     FROM auth_tokens
     WHERE token_hash = $1
       AND type = $2
       AND used_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash, type]
  );

  return result.rows[0] || null;
};

const markAuthTokenAsUsed = async ({ pool, tokenId }) => {
  await pool.query(
    `UPDATE auth_tokens
     SET used_at = NOW()
     WHERE id = $1`,
    [tokenId]
  );
};

const invalidateUserTokens = async ({ pool, userId, type }) => {
  await pool.query(
    `UPDATE auth_tokens
     SET used_at = NOW()
     WHERE user_id = $1
       AND type = $2
       AND used_at IS NULL`,
    [userId, type]
  );
};

module.exports = {
  TOKEN_TYPES,
  createAuthToken,
  findValidAuthToken,
  markAuthTokenAsUsed,
  invalidateUserTokens,
};
