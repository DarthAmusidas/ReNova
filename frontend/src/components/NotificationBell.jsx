import { useEffect, useRef, useState } from "react";
import {
  getNotifications,
  markNotificationAsRead,
  markNotificationsAsRead,
} from "../services/notificationService";

// Cada cuánto se buscan notificaciones nuevas mientras la pestaña está visible.
const REFRESH_INTERVAL_MS = 60 * 1000;

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

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") loadNotifications();
    }, REFRESH_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadNotifications();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
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

  // Abrir la campana solo muestra las notificaciones: marcarlas como leídas
  // es una acción explícita (tocando una o con "Marcar todas").
  const handleToggle = () => {
    const nextOpenState = !isOpen;

    setIsOpen(nextOpenState);

    if (nextOpenState) loadNotifications();
  };

  const handleMarkOne = async (notification) => {
    if (notification.is_read) return;

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      )
    );
    setUnreadCount((count) => Math.max(count - 1, 0));

    try {
      await markNotificationAsRead(notification.id);
    } catch (error) {
      console.error("Error marcando notificación como leída:", error);
      loadNotifications();
    }
  };

  const handleMarkAll = async () => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, is_read: true }))
    );
    setUnreadCount(0);

    try {
      await markNotificationsAsRead();
    } catch (error) {
      console.error("Error marcando notificaciones como leídas:", error);
      loadNotifications();
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

          {unreadCount > 0 && (
            <button
              type="button"
              className="notification-bell-mark-all"
              onClick={handleMarkAll}
            >
              Marcar todas como leídas
            </button>
          )}

          {notifications.length === 0 ? (
            <div className="notification-bell-empty">
              No tenés notificaciones por el momento.
            </div>
          ) : (
            <div className="notification-bell-list">
              {notifications.map((notification) => {
                // Las no leídas son botones: se marcan como leídas al tocarlas.
                const Item = notification.is_read ? "article" : "button";

                return (
                <Item
                  key={notification.id}
                  type={notification.is_read ? undefined : "button"}
                  className={
                    notification.is_read
                      ? "notification-bell-item"
                      : "notification-bell-item notification-bell-item-unread"
                  }
                  onClick={notification.is_read ? undefined : () => handleMarkOne(notification)}
                  title={notification.is_read ? undefined : "Tocá para marcar como leída"}
                >
                  <div className="notification-bell-item-header">
                    <strong>{notification.title || "Notificación"}</strong>

                    {!notification.is_read && (
                      <span className="notification-bell-unread-dot" />
                    )}
                  </div>

                  <p>{notification.message}</p>

                  <time>{formatDate(notification.created_at)}</time>
                </Item>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
