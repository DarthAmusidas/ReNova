function HeaderUserCard({ user = null }) {
  const userName = user?.name || "Usuario";

  const roleLabel =
    user?.role === "SUPERMARKET"
      ? "Supermercado"
      : user?.role === "ADMIN"
      ? "Administrador"
      : "Comedor";

  const getInitials = (name = "Usuario") =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

  return (
    <div className="renova-user-summary renova-header-user-card">
      <div className="renova-user-avatar">
        {getInitials(userName)}
      </div>

      <div className="renova-user-meta">
        <span>Usuario</span>
        <strong>{userName}</strong>
        <small>{roleLabel}</small>
      </div>
    </div>
  );
}

export default HeaderUserCard;
