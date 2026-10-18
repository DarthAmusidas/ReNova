-- Seguridad de sesiones: fecha del último cambio de contraseña.
-- Los tokens (JWT) emitidos antes de esa fecha dejan de valer
-- (ver backend/src/services/sessionService.js).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_changed_at timestamp with time zone;
