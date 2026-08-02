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
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.notifications)) return data.notifications;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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
    <div className="notification-bell-root" ref={dropdownRef}>
      <button
        type="button"
        className="notification-bell-button"
        onClick={handleToggle}
        aria-label="Ver notificaciones"
      >
        <svg
          className="notification-bell-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="notification-bell-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-bell-dropdown">
          <div className="notification-bell-header">
            <h3>Notificaciones</h3>

            <span>{unreadCount} sin leer</span>
          </div>

          {notifications.length === 0 ? (
            <div className="notification-bell-empty">
              No tenés notificaciones por el momento.
            </div>
          ) : (
            <div className="notification-bell-list">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={
                    notification.is_read
                      ? "notification-bell-item"
                      : "notification-bell-item notification-bell-item-unread"
                  }
                >
                  <div className="notification-bell-item-header">
                    <strong>{notification.title || "Notificación"}</strong>

                    {!notification.is_read && (
                      <span className="notification-bell-unread-dot" />
                    )}
                  </div>

                  <p>{notification.message}</p>

                  <time>{formatDate(notification.created_at)}</time>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
