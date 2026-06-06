import { useEffect, useRef, useState } from "react";
import {
  getNotifications,
  markNotificationsAsRead,
} from "../services/notificationService";

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const normalizeNotifications = (data) => {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.notifications)) {
      return data.notifications;
    }

    if (Array.isArray(data?.data)) {
      return data.data;
    }

    return [];
  };

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();

      console.log("Notifications API response:", data);

      const notificationList = normalizeNotifications(data);

      setNotifications(notificationList);

      const unread = notificationList.filter(
        (notification) => notification.is_read === false
      ).length;

      setUnreadCount(unread);
    } catch (error) {
      console.error("Error cargando notificaciones:", error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggle = async () => {
    const nextOpenState = !isOpen;

    setIsOpen(nextOpenState);

    if (nextOpenState) {
      await loadNotifications();

      if (unreadCount > 0) {
        try {
          await markNotificationsAsRead();

          setNotifications((currentNotifications) =>
            currentNotifications.map((notification) => ({
              ...notification,
              is_read: true,
            }))
          );

          setUnreadCount(0);
        } catch (error) {
          console.error("Error marcando notificaciones como leídas:", error);
        }
      }
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button type="button" style={styles.button} onClick={handleToggle}>
        🔔


        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <h3 style={styles.title}>Notificaciones</h3>

            <span style={styles.unreadPill}>
              {unreadCount} sin leer
            </span>
          </div>

          {notifications.length === 0 ? (
            <div style={styles.emptyBox}>
              No tenés notificaciones por el momento.
            </div>
          ) : (
            <div style={styles.list}>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    ...styles.notificationItem,
                    ...(notification.is_read
                      ? styles.notificationRead
                      : styles.notificationUnread),
                  }}
                >
                  <div style={styles.notificationHeader}>
                    <strong style={styles.notificationTitle}>
                      {notification.title || "Notificación"}
                    </strong>

                    {!notification.is_read && (
                      <span style={styles.dot}></span>
                    )}
                  </div>

                  <p style={styles.notificationMessage}>
                    {notification.message}
                  </p>

                  <span style={styles.notificationDate}>
                    {formatDate(notification.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: "relative",
  },

  button: {
    width: "64px",
    height: "64px",
    border: "none",
    borderRadius: "24px",
    background: "#ffffff",
    color: "#102018",
    fontSize: "1.45rem",
    boxShadow: "0 18px 45px rgba(31,77,28,0.1)",
    position: "relative",
  },

  badge: {
    position: "absolute",
    top: "-6px",
    right: "-6px",
    minWidth: "23px",
    height: "23px",
    borderRadius: "999px",
    background: "#d6453d",
    color: "#ffffff",
    fontSize: "0.75rem",
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 6px",
  },

  dropdown: {
    position: "absolute",
    top: "78px",
    right: 0,
    width: "420px",
    maxHeight: "520px",
    overflowY: "auto",
    background: "#ffffff",
    border: "1px solid #e1eadc",
    borderRadius: "28px",
    boxShadow: "0 28px 70px rgba(31,77,28,0.22)",
    padding: "20px",
    zIndex: 2000,
  },

  dropdownHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "18px",
  },

  title: {
    margin: 0,
    color: "#102018",
    fontSize: "1.45rem",
    fontWeight: 950,
  },

  unreadPill: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    background: "#e8f4df",
    color: "#21801f",
    padding: "8px 13px",
    fontSize: "0.82rem",
    fontWeight: 950,
  },

  emptyBox: {
    background: "#f7faf4",
    border: "1px solid #e1eadc",
    borderRadius: "18px",
    padding: "20px",
    color: "#667066",
    fontSize: "1rem",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  notificationItem: {
    border: "1px solid #e1eadc",
    borderRadius: "18px",
    padding: "16px",
  },

  notificationUnread: {
    background: "#f3faef",
    borderColor: "#9ed58d",
  },

  notificationRead: {
    background: "#ffffff",
  },

  notificationHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },

  notificationTitle: {
    color: "#102018",
    fontSize: "1rem",
    fontWeight: 950,
  },

  dot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    background: "#2f9728",
    flexShrink: 0,
  },

  notificationMessage: {
    margin: "8px 0 10px",
    color: "#536057",
    fontSize: "0.95rem",
    lineHeight: 1.45,
  },

  notificationDate: {
    color: "#8a948c",
    fontSize: "0.82rem",
    fontWeight: 700,
  },
};

export default NotificationBell;