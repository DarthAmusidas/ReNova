-- Mensajería entre la ONG y el comercio de una reserva (chat en tiempo real).
-- Se habilita cuando el comercio confirma la reserva; al completarse o
-- cancelarse queda como historial de solo lectura.

CREATE TABLE IF NOT EXISTS reservation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS reservation_messages_reservation_idx
  ON reservation_messages (reservation_id, created_at);

-- Para contar rápido los mensajes sin leer.
CREATE INDEX IF NOT EXISTS reservation_messages_unread_idx
  ON reservation_messages (reservation_id)
  WHERE read_at IS NULL;

-- Nuevo tipo de notificación para los mensajes.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'NEW_PRODUCT',
    'RESERVATION_REQUEST',
    'RESERVATION_UPDATE',
    'RESERVATION_CANCELLED',
    'RESERVATION_CREATED',
    'RESERVATION_CONFIRMED',
    'RESERVATION_COMPLETED',
    'SYSTEM',
    'NEW_MESSAGE'
  )
);
