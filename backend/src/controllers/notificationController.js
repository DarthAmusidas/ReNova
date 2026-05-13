const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

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

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

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