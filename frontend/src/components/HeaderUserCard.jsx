import { pageStyles as styles } from "../styles/pageStyles";

function HeaderUserCard({ user }) {
  const role = user?.role || "";
  const userName = user?.name || "Usuario";
  const roleLabel =
    user?.organization_type ||
    (role === "SUPERMARKET"
      ? "Supermercado"
      : role === "ADMIN"
      ? "Administrador"
      : role === "ONG"
      ? "ONG"
      : "No informado");
  const userIcon =
    role === "ADMIN"
      ? "🛡️"
      : role === "SUPERMARKET"
      ? "🛒"
      : role === "ONG"
      ? "🤝"
      : "👤";

  return (
    <div style={styles.userCard}>
      <div style={styles.userAvatar}>{userIcon}</div>

      <div style={styles.userInfo}>
        <span style={styles.sessionText}>Usuario</span>
        <strong style={styles.userName}>{userName}</strong>
        <span style={styles.rolePill}>{roleLabel}</span>
      </div>
    </div>
  );
}

export default HeaderUserCard;
