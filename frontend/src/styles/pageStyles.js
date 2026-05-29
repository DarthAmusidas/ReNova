export const pageStyles = {
  layout: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "270px 1fr",
    background: "#f6f9f2",
    color: "#102018",
  },

  sidebar: {
    background: "#102018",
    color: "#ffffff",
    padding: "34px 22px 24px",
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
  },

  logoBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "42px",
  },

  logoIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "16px",
    background: "#e8f4df",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
  },

  logoText: {
    margin: 0,
    fontSize: "1.45rem",
    fontWeight: 900,
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  navButton: {
    border: "none",
    borderRadius: "16px",
    background: "transparent",
    color: "rgba(255,255,255,0.8)",
    padding: "15px 18px",
    textAlign: "left",
    fontWeight: 800,
    fontSize: "0.98rem",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  navButtonActive: {
    border: "none",
    borderRadius: "16px",
    background: "rgba(126, 191, 26, 0.24)",
    color: "#ffffff",
    padding: "15px 18px",
    textAlign: "left",
    fontWeight: 900,
    fontSize: "0.98rem",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  logoutButton: {
    marginTop: "auto",
    width: "100%",
    minHeight: "52px",
    border: "none",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.13)",
    color: "#ffffff",
    fontWeight: 900,
    fontSize: "0.95rem",
  },

  main: {
    padding: "42px 48px",
    background:
      "radial-gradient(circle at 95% 0%, rgba(126,191,26,0.08), transparent 28%), #f6f9f2",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "32px",
    marginBottom: "34px",
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "10px 18px",
    borderRadius: "999px",
    background: "#e8f4df",
    color: "#21801f",
    fontWeight: 900,
    fontSize: "0.95rem",
  },

  title: {
    margin: "26px 0 10px",
    fontSize: "2.45rem",
    lineHeight: 1.1,
    letterSpacing: "-0.8px",
    color: "#102018",
  },

  subtitle: {
    margin: 0,
    color: "#647066",
    fontSize: "1.05rem",
    lineHeight: 1.6,
  },

  userArea: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    paddingTop: "30px",
  },

  userCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "#ffffff",
    border: "1px solid #e1eadc",
    borderRadius: "26px",
    padding: "16px 20px",
    minWidth: "290px",
    boxShadow: "0 18px 45px rgba(31,77,28,0.08)",
  },

  userAvatar: {
    width: "56px",
    height: "56px",
    borderRadius: "20px",
    background: "#e8f4df",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "27px",
    flexShrink: 0,
  },

  userInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: 0,
  },

  sessionText: {
    color: "#7a867c",
    fontSize: "0.78rem",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },

  userName: {
    color: "#102018",
    fontSize: "1.08rem",
    fontWeight: 950,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  rolePill: {
    width: "fit-content",
    marginTop: "3px",
    padding: "5px 11px",
    borderRadius: "999px",
    background: "#f0f7ea",
    color: "#21801f",
    fontSize: "0.76rem",
    fontWeight: 900,
  },

  bellWrapper: {
    transform: "scale(1.05)",
  },

  topActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },

  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
    gap: "22px",
  },

  card: {
    background: "#ffffff",
    border: "1px solid #e1eadc",
    borderRadius: "30px",
    padding: "28px",
    boxShadow: "0 18px 45px rgba(31,77,28,0.07)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "16px",
  },

  cardIcon: {
    width: "54px",
    height: "54px",
    borderRadius: "19px",
    background: "#e8f4df",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
  },

  cardTitle: {
    margin: 0,
    color: "#102018",
    fontSize: "1.3rem",
    lineHeight: 1.25,
    fontWeight: 950,
  },

  cardText: {
    margin: "10px 0 0",
    color: "#607064",
    fontSize: "0.98rem",
    lineHeight: 1.6,
  },

  metaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "20px",
  },

  metaItem: {
    background: "#f7faf4",
    border: "1px solid #e6efdf",
    borderRadius: "18px",
    padding: "13px 14px",
  },

  metaLabel: {
    display: "block",
    color: "#7a867c",
    fontSize: "0.76rem",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    marginBottom: "5px",
  },

  metaValue: {
    display: "block",
    color: "#102018",
    fontSize: "0.95rem",
    fontWeight: 900,
  },

  cardActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "22px",
  },

  primaryButton: {
    border: "none",
    borderRadius: "15px",
    background: "#2f9728",
    color: "#ffffff",
    padding: "13px 19px",
    fontWeight: 900,
    fontSize: "0.95rem",
    boxShadow: "0 14px 26px rgba(47,151,40,0.18)",
  },

  secondaryButton: {
    border: "1px solid #d6e4d0",
    borderRadius: "15px",
    background: "#ffffff",
    color: "#223025",
    padding: "13px 19px",
    fontWeight: 900,
    fontSize: "0.95rem",
  },

  dangerButton: {
    border: "none",
    borderRadius: "15px",
    background: "#d6453d",
    color: "#ffffff",
    padding: "13px 19px",
    fontWeight: 900,
    fontSize: "0.95rem",
  },

  warningButton: {
    border: "none",
    borderRadius: "15px",
    background: "#d89522",
    color: "#ffffff",
    padding: "13px 19px",
    fontWeight: 900,
    fontSize: "0.95rem",
  },

  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "0.78rem",
    fontWeight: 950,
  },

  emptyState: {
    background: "#ffffff",
    border: "1px solid #e1eadc",
    borderRadius: "30px",
    padding: "42px",
    textAlign: "center",
    boxShadow: "0 18px 45px rgba(31,77,28,0.07)",
  },

  emptyTitle: {
    margin: "0 0 10px",
    color: "#102018",
    fontSize: "1.4rem",
  },

  emptyText: {
    margin: 0,
    color: "#647066",
    fontSize: "1rem",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(10,20,12,0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
    zIndex: 1000,
  },

  modalCard: {
    width: "100%",
    maxWidth: "530px",
    background: "#ffffff",
    borderRadius: "30px",
    padding: "32px",
    boxShadow: "0 28px 70px rgba(0,0,0,0.22)",
  },

  modalTitle: {
    margin: "0 0 12px",
    color: "#102018",
    fontSize: "1.6rem",
  },

  modalText: {
    margin: "0 0 22px",
    color: "#607064",
    lineHeight: 1.6,
  },

  inputGroup: {
    marginBottom: "18px",
  },

  inputLabel: {
    display: "block",
    color: "#102018",
    fontWeight: 900,
    marginBottom: "8px",
  },

  input: {
    width: "100%",
    minHeight: "54px",
    border: "1.5px solid #d9e5d4",
    borderRadius: "16px",
    padding: "0 16px",
    fontSize: "1rem",
    outline: "none",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "26px",
  },

  errorBox: {
    background: "#fde9e7",
    color: "#b9322a",
    borderRadius: "16px",
    padding: "14px 16px",
    marginBottom: "18px",
    fontWeight: 900,
  },

  successBox: {
    background: "#e8f4df",
    color: "#1d7d24",
    borderRadius: "16px",
    padding: "14px 16px",
    marginBottom: "18px",
    fontWeight: 900,
  },
};

export const getStatusStyle = (status) => {
  const base = pageStyles.statusBadge;

  const normalized = String(status || "").toUpperCase();

  if (normalized === "AVAILABLE") {
    return {
      ...base,
      background: "#e8f4df",
      color: "#1d7d24",
    };
  }

  if (normalized === "CONFIRMED") {
    return {
      ...base,
      background: "#e3f0ff",
      color: "#1d5f9d",
    };
  }

  if (normalized === "COMPLETED") {
    return {
      ...base,
      background: "#e8f4df",
      color: "#1d7d24",
    };
  }

  if (normalized === "CANCELLED" || normalized === "CANCELED") {
    return {
      ...base,
      background: "#fde9e7",
      color: "#b9322a",
    };
  }

  if (normalized === "PENDING") {
    return {
      ...base,
      background: "#fff5d8",
      color: "#9a6a00",
    };
  }

  return {
    ...base,
    background: "#f1f4ef",
    color: "#58645b",
  };
};