import { useEffect, useState } from "react";
import {
  getNotifications,
  markNotificationsAsRead,
} from "../services/notificationService";

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const data = await getNotifications();

        if (isMounted) {
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error("Error al cargar notificaciones:", error);
      }
    };

    fetchNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const handleToggle = async () => {
    const nextOpenValue = !open;
    setOpen(nextOpenValue);

    if (nextOpenValue && unreadCount > 0) {
      try {
        await markNotificationsAsRead();

        setNotifications((currentNotifications) =>
          currentNotifications.map((notification) => ({
            ...notification,
            is_read: true,
          }))
        );
      } catch (error) {
        console.error("Error al marcar notificaciones como leídas:", error);
      }
    }
  };

  const styles = {
    wrapper: {
      position: "relative",
      width: "68px",
      height: "68px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },

    button: {
      width: "68px",
      height: "68px",
      minWidth: "68px",
      minHeight: "68px",
      border: "1px solid #dbead3",
      borderRadius: "22px",
      background: "#ffffff",
      color: "#2f8f2c",
      fontSize: "1.65rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
      boxShadow: "0 18px 38px rgba(43, 69, 38, 0.12)",
      position: "relative",
      cursor: "pointer",
    },

    count: {
      position: "absolute",
      top: "-8px",
      right: "-8px",
      minWidth: "28px",
      height: "28px",
      padding: "0 8px",
      borderRadius: "999px",
      background: "#c0392b",
      color: "#ffffff",
      fontSize: "0.8rem",
      fontWeight: 900,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "3px solid #ffffff",
      lineHeight: 1,
    },

    dropdown: {
      position: "absolute",
      top: "82px",
      right: 0,
      width: "410px",
      maxHeight: "500px",
      overflowY: "auto",
      background: "#ffffff",
      border: "1px solid #dbead3",
      borderRadius: "28px",
      boxShadow: "0 28px 80px rgba(16, 32, 24, 0.2)",
      zIndex: 100,
      padding: "20px",
    },

    dropdownHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px",
    },

    title: {
      margin: 0,
      color: "#102018",
      fontSize: "1.35rem",
    },

    unreadBadge: {
      color: "#2f8f2c",
      background: "#e8f4df",
      padding: "8px 13px",
      borderRadius: "999px",
      fontWeight: 900,
      fontSize: "0.82rem",
    },

    empty: {
      color: "#667066",
      background: "#f4faf0",
      border: "1px solid #dcebd5",
      borderRadius: "18px",
      padding: "16px",
      lineHeight: 1.5,
    },

    item: {
      border: "1px solid #e5eedf",
      borderRadius: "18px",
      padding: "15px",
      marginBottom: "10px",
      background: "#ffffff",
    },

    unreadItem: {
      background: "#f4faf0",
      borderColor: "#bfe3b4",
    },

    itemTitle: {
      display: "block",
      color: "#102018",
      marginBottom: "6px",
      fontSize: "0.95rem",
    },

    itemText: {
      margin: "0 0 8px",
      color: "#667066",
      lineHeight: 1.5,
      fontSize: "0.9rem",
    },

    itemDate: {
      color: "#8b968d",
      fontSize: "0.78rem",
    },
  };

  return (
    <div style={styles.wrapper}>
      <button type="button" style={styles.button} onClick={handleToggle}>
        🔔

        {unreadCount > 0 && <span style={styles.count}>{unreadCount}</span>}
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <h3 style={styles.title}>Notificaciones</h3>

            <span style={styles.unreadBadge}>{unreadCount} sin leer</span>
          </div>

          {notifications.length === 0 && (
            <div style={styles.empty}>
              No tenés notificaciones por el momento.
            </div>
          )}

          {notifications.slice(0, 6).map((notification) => (
            <div
              key={notification.id}
              style={{
                ...styles.item,
                ...(!notification.is_read ? styles.unreadItem : {}),
              }}
            >
              <strong style={styles.itemTitle}>{notification.title}</strong>

              <p style={styles.itemText}>{notification.message}</p>

              <small style={styles.itemDate}>
                {notification.created_at
                  ? new Date(notification.created_at).toLocaleString("es-AR")
                  : ""}
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;