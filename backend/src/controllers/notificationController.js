// Controlador de notificaciones
const { Pool } = require("pg");
const { isValidUUID } = require("../utils/validators");

// Conexión a la base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Obtiene las notificaciones del usuario autenticado
const getNotifications = async (req, res) => {
  try {
    // El usuario se obtiene desde el token JWT
    const userId = req.user.id;

    // Busca las notificaciones del usuario ordenadas por fecha
    const result = await pool.query(
      `SELECT
        id,
        user_id,
        title,
        message,
        type,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [userId]
    );

    // Responde con las notificaciones encontradas
    res.json({
      message: "Notificaciones obtenidas correctamente",
      notifications: result.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al obtener notificaciones"
    });
  }
};

// Marca una notificación como leída
const markNotificationAsRead = async (req, res) => {
  try {
    // Extrae el ID de la notificación desde la URL
    const { id } = req.params;

    // El usuario se obtiene desde el token JWT
    const userId = req.user.id;

    // Valida formato UUID de la notificación
    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: "El id de la notificación debe ser un UUID válido"
      });
    }

    // Actualiza la notificación solo si pertenece al usuario autenticado
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    // Si no se encontró, puede no existir o no pertenecer al usuario
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Notificación no encontrada"
      });
    }

    // Responde con la notificación actualizada
    res.json({
      message: "Notificación marcada como leída",
      notification: result.rows[0]
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al actualizar notificación"
    });
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead
};