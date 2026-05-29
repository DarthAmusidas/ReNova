const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        id,
        user_id,
        title,
        message,
        type,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);

    res.status(500).json({
      error: "Error obteniendo notificaciones",
    });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1
        AND user_id = $2
      RETURNING *
      `,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Notificación no encontrada",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error marcando notificación:", error);

    res.status(500).json({
      error: "Error marcando notificación",
    });
  }
};

const markNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1
        AND is_read = false
      RETURNING *
      `,
      [userId]
    );

    res.json({
      message: "Notificaciones marcadas como leídas",
      notifications: result.rows,
    });
  } catch (error) {
    console.error("Error marcando notificaciones:", error);

    res.status(500).json({
      error: "Error marcando notificaciones",
    });
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markNotificationsAsRead,
};