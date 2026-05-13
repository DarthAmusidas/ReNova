// Controlador de notificaciones del usuario
const { Pool } = require("pg");

// Conexión a la base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Obtiene las notificaciones del usuario autenticado
const getNotifications = async (req, res) => {
  try {
    // Obtiene el ID del usuario autenticado
    const userId = req.user.id;

    // Busca todas las notificaciones del usuario, ordenadas por fecha descendente
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

    res.json({
      message: "Notificaciones obtenidas correctamente",
      notifications: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al obtener notificaciones",
    });
  }
};

// Marca una notificación como leída para el usuario autenticado
const markNotificationAsRead = async (req, res) => {
  try {
    // Obtiene el ID de la notificación del parámetro de ruta
    const { id } = req.params;
    // Obtiene el ID del usuario autenticado
    const userId = req.user.id;

    // Actualiza el campo is_read a true solo para notificaciones del usuario
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Notificación no encontrada",
      });
    }

    res.json({
      message: "Notificación marcada como leída",
      notification: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al actualizar notificación",
    });
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
};