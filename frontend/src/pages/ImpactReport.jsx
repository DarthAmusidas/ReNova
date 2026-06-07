import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDashboardSummary } from "../services/dashboardService";
import sidebarLogo from "../assets/renova-logo-tr-verde.png";
import reportLogo from "../assets/renova-logo-transparent.png";

const emptyReport = {
  total_products_published: 0,
  total_reservations_received: 0,
  completed_reservations: 0,
  pending_reservations: 0,
  cancelled_reservations: 0,
  distinct_ongs_helped: 0,
  total_quantity_delivered: 0,
  delivered_by_unit: [],
  measured_kg_recovered: 0,
  co2_factor_per_kg: 2.5,
  estimated_co2_avoided: 0,
  utilization_rate: 0,
  top_ongs: [],
  monthly_completed_deliveries: [],
};

const CO2_METHOD_TEXT =
  "Metodología: los kg de comida recuperada se calculan sumando solo reservas completadas de productos cargados con unidad kg/kilo/kilos. El CO₂ evitado es una estimación referencial: kg de comida recuperada × 2,5 kg CO₂e.";

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const roundMetric = (value, decimals = 2) => {
  const number = toNumber(value);
  return Number(number.toFixed(decimals));
};

const normalizeUnit = (unit) => {
  const value = String(unit || "")
    .trim()
    .toLowerCase();

  if (!value) return "sin unidad informada";

  if (["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(value)) {
    return "kilos";
  }

  if (["unidad", "unidades", "u", "ud", "uds"].includes(value)) {
    return "unidades";
  }

  if (["caja", "cajas"].includes(value)) {
    return "cajas";
  }

  if (["paquete", "paquetes"].includes(value)) {
    return "paquetes";
  }

  if (["bolsa", "bolsas"].includes(value)) {
    return "bolsas";
  }

  if (["litro", "litros", "l"].includes(value)) {
    return "litros";
  }

  return value;
};

const formatNumber = (value, suffix = "") => {
  const number = toNumber(value);

  const formatted = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
  }).format(number);

  return suffix ? `${formatted} ${suffix}` : formatted;
};

const formatPercent = (value) => {
  return `${formatNumber(value)} %`;
};

const formatDate = (dateValue = new Date()) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return date.toLocaleDateString("es-AR");
};

const getStoredUser = () => {
  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
};

const getRoleLabel = (user) => {
  return user?.organization_type || user?.role || "Usuario";
};

const getRoleIcon = (role) => {
  const normalizedRole = String(role || "").toUpperCase();

  if (normalizedRole === "ADMIN") return "🛡️";
  if (normalizedRole === "SUPERMARKET") return "🛒";
  if (normalizedRole === "ONG") return "🤝";

  return "👤";
};

const normalizeReport = (payload) => {
  const source = payload?.summary || payload?.dashboard || payload?.data || payload || {};
  const report =
    source?.impact_report ||
    source?.market_impact_report ||
    source?.report ||
    null;

  return {
    ...emptyReport,
    ...(report || {}),
    delivered_by_unit: Array.isArray(report?.delivered_by_unit)
      ? report.delivered_by_unit.map((item) => ({
          ...item,
          unit: normalizeUnit(item.unit),
          quantity: toNumber(item.quantity),
        }))
      : [],
    top_ongs: Array.isArray(report?.top_ongs) ? report.top_ongs : [],
    monthly_completed_deliveries: Array.isArray(
      report?.monthly_completed_deliveries
    )
      ? report.monthly_completed_deliveries
      : [],
  };
};

const getMaxMonthValue = (monthlyItems) => {
  const values = monthlyItems.map((item) =>
    toNumber(item.completed_deliveries)
  );

  return Math.max(...values, 1);
};

export default function ImpactReport() {
  const navigate = useNavigate();
  const storedUser = useMemo(() => getStoredUser(), []);
  const [user, setUser] = useState(storedUser);
  const [report, setReport] = useState(emptyReport);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const role = String(user?.role || "").toUpperCase();
  const isAdmin = role === "ADMIN";

  const deliveredByUnit = Array.isArray(report?.delivered_by_unit)
    ? report.delivered_by_unit.map((item) => ({
        ...item,
        unit: normalizeUnit(item.unit),
        quantity: toNumber(item.quantity),
      }))
    : [];
  const totalQuantityDelivered = toNumber(report?.total_quantity_delivered);
  const effectiveDeliveredByUnit =
    deliveredByUnit.length > 0
      ? deliveredByUnit
      : totalQuantityDelivered > 0
      ? [
          {
            unit: "sin unidad informada",
            quantity: totalQuantityDelivered,
          },
        ]
      : [];
  const co2Factor = toNumber(report?.co2_factor_per_kg) || 2.5;
  const backendKgRecovered = toNumber(report?.measured_kg_recovered);
  const backendCo2Avoided = toNumber(report?.estimated_co2_avoided);

  const kilosFromDeliveredByUnit =
    effectiveDeliveredByUnit.find((item) => normalizeUnit(item.unit) === "kilos")
      ?.quantity || 0;

  const effectiveKgRecovered =
    backendKgRecovered > 0
      ? backendKgRecovered
      : kilosFromDeliveredByUnit > 0
      ? kilosFromDeliveredByUnit
      : backendCo2Avoided > 0 && co2Factor > 0
      ? backendCo2Avoided / co2Factor
      : 0;

  const effectiveCo2Avoided =
    effectiveKgRecovered > 0
      ? effectiveKgRecovered * co2Factor
      : backendCo2Avoided;

  const fetchImpactReport = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getDashboardSummary();
      const source = data?.summary || data?.dashboard || data?.data || data || {};

      setUser(source.user || data.user || storedUser);
      setReport(normalizeReport(data));
    } catch (err) {
      console.error("Error cargando reporte de impacto:", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
        error: err,
      });

      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
          "No se pudo cargar el reporte de impacto."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImpactReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handlePrint = () => {
    window.print();
  };

  const maxMonthValue = getMaxMonthValue(report.monthly_completed_deliveries);

  const canViewReport =
    String(user?.role || "").toUpperCase() === "SUPERMARKET" ||
    String(user?.role || "").toUpperCase() === "ADMIN";

  return (
    <div style={styles.appShell}>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }

            .impact-report-print-area,
            .impact-report-print-area * {
              visibility: visible !important;
            }

            .impact-report-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: white !important;
              padding: 28px !important;
              box-shadow: none !important;
              border: none !important;
            }

            .no-print {
              display: none !important;
            }

            .impact-report-print-area section,
            .impact-report-print-area article {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}
      </style>

      <aside style={styles.sidebar} className="no-print">
        <div style={styles.sidebarLogoContainer}>
          <img src={sidebarLogo} alt="ReNova" style={styles.sidebarLogo} />
        </div>

        <nav style={styles.nav}>
          <Link to="/dashboard" style={styles.navItem}>
            <span>📊</span>
            <span>Dashboard</span>
          </Link>

          <Link to="/products" style={styles.navItem}>
            <span>🥦</span>
            <span>Productos</span>
          </Link>

          <Link to="/reservations" style={styles.navItem}>
            <span>📋</span>
            <span>Reservas</span>
          </Link>

          <Link to="/impact" style={styles.navItemActive}>
            <span>📈</span>
            <span>Impacto</span>
          </Link>

          {isAdmin && (
            <Link to="/admin/users" style={styles.navItem}>
              <span>👥</span>
              <span>Usuarios</span>
            </Link>
          )}
        </nav>

        <button type="button" onClick={handleLogout} style={styles.logoutButton}>
          Cerrar sesión
        </button>
      </aside>

      <main style={styles.mainContent}>
        <header style={styles.header} className="no-print">
          <div>
            <span style={styles.pageBadge}>Reporte</span>
            <h1 style={styles.pageTitle}>Reporte de impacto</h1>
            <p style={styles.pageSubtitle}>
              Indicadores calculados a partir de productos publicados y reservas
              completadas.
            </p>
          </div>

          <div style={styles.userArea}>
            <div style={styles.userCard}>
              <div style={styles.userIcon}>{getRoleIcon(user?.role)}</div>
              <div>
                <div style={styles.userLabel}>Usuario</div>
                <strong style={styles.userName}>
                  {user?.name || "Usuario"}
                </strong>
                <div style={styles.userRole}>{getRoleLabel(user)}</div>
              </div>
            </div>
            <div style={styles.notificationButton}>🔔</div>
          </div>
        </header>

        <section
          className="impact-report-print-area"
          style={styles.reportContainer}
        >
          <div style={styles.reportHeader}>
            <img src={reportLogo} alt="ReNova" style={styles.reportLogo} />

            <div style={styles.reportMeta}>
              <strong>Reporte de impacto</strong>
              <span>Generado: {formatDate(new Date())}</span>
              <span>{user?.name || "Usuario"}</span>
            </div>
          </div>

          <hr style={styles.reportDivider} />

          <div style={styles.reportTitleRow}>
            <div>
              <h2 style={styles.reportTitle}>Reporte de impacto</h2>
              <p style={styles.reportSubtitle}>
                Indicadores calculados a partir de productos publicados y
                reservas completadas.
              </p>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              style={styles.printButton}
              className="no-print"
            >
              Imprimir reporte
            </button>
          </div>

          {loading && (
            <div style={styles.infoBox}>Cargando reporte de impacto...</div>
          )}

          {!loading && error && <div style={styles.errorBox}>{error}</div>}

          {!loading && !error && !canViewReport && (
            <div style={styles.infoBox}>
              El reporte de impacto está disponible para supermercados y
              administradores.
            </div>
          )}

          {!loading && !error && canViewReport && (
            <>
              <section style={styles.summaryGrid}>
                <MetricCard
                  label="Productos publicados"
                  value={formatNumber(report.total_products_published)}
                />
                <MetricCard
                  label="Reservas recibidas"
                  value={formatNumber(report.total_reservations_received)}
                />
                <MetricCard
                  label="Reservas completadas"
                  value={formatNumber(report.completed_reservations)}
                />
                <MetricCard
                  label="ONG beneficiadas"
                  value={formatNumber(report.distinct_ongs_helped)}
                />
                <MetricCard
                  label="Cantidad entregada"
                  value={formatNumber(totalQuantityDelivered)}
                  description="Total de productos entregados, según reservas completadas."
                />
              </section>

              <section style={styles.twoColumnGrid}>
                <article style={{ ...styles.panel, ...styles.tasaPanel }}>
                  <MetricCard
                    label="Tasa de aprovechamiento"
                    value={formatPercent(report.utilization_rate)}
                    description="Porcentaje de reservas recibidas que finalizaron como entregas completadas."
                    formula="Fórmula: completadas ÷ recibidas × 100."
                    tall
                    flush
                  />
                </article>

                <article style={styles.panel}>
                  <h3 style={styles.sectionTitle}>
                    Impacto ambiental estimado
                  </h3>

                  <p style={styles.panelText}>
                    Estos indicadores son estimaciones referenciales calculadas
                    a partir de reservas completadas.
                  </p>

                  <div style={styles.environmentGrid}>
                    <MetricCard
                      label="Kg de comida recuperada"
                      value={formatNumber(
                        roundMetric(effectiveKgRecovered),
                        "kg"
                      )}
                    />
                    <MetricCard
                      label="CO₂ evitado estimado"
                      value={formatNumber(
                        roundMetric(effectiveCo2Avoided),
                        "kg CO₂e"
                      )}
                    />
                  </div>

                  <p style={styles.methodText}>{CO2_METHOD_TEXT}</p>
                </article>
              </section>

              <section style={styles.twoColumnGrid}>
                <article style={styles.panel}>
                  <h3 style={styles.sectionTitle}>Top ONG beneficiadas</h3>

                  {report.top_ongs.length > 0 ? (
                    <div style={styles.rankingList}>
                      {report.top_ongs.map((ong) => (
                        <div key={ong.id || ong.name} style={styles.rankingRow}>
                          <div>
                            <strong>{ong.name || "ONG sin nombre"}</strong>
                            {ong.organization_type && (
                              <span style={styles.rankingType}>
                                {ong.organization_type}
                              </span>
                            )}
                          </div>
                          <strong>
                            {formatNumber(ong.completed_reservations)}{" "}
                            completadas
                          </strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={styles.panelText}>
                      Todavía no hay datos suficientes.
                    </p>
                  )}
                </article>

                <article style={styles.panel}>
                  <h3 style={styles.sectionTitle}>
                    Entregas completadas por mes
                  </h3>

                  {report.monthly_completed_deliveries.length > 0 ? (
                    <div style={styles.monthList}>
                      {report.monthly_completed_deliveries.map((item) => {
                        const value = toNumber(item.completed_deliveries);
                        const width = Math.max(
                          6,
                          Math.round((value / maxMonthValue) * 100)
                        );

                        return (
                          <div key={item.month} style={styles.monthRow}>
                            <span style={styles.monthLabel}>{item.month}</span>
                            <div style={styles.monthBarTrack}>
                              <div
                                style={{
                                  ...styles.monthBarFill,
                                  width: `${width}%`,
                                }}
                              />
                            </div>
                            <strong style={styles.monthValue}>{value}</strong>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={styles.panelText}>
                      Todavía no hay entregas completadas por mes.
                    </p>
                  )}
                </article>
              </section>

              <footer style={styles.reportFooter}>
                Reporte generado por ReNova
              </footer>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  formula,
  tall = false,
  flush = false,
}) {
  return (
    <div
      style={{
        ...styles.metricCard,
        ...(tall ? styles.metricCardTall : {}),
        ...(flush ? styles.metricCardFlush : {}),
      }}
    >
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
      {description && (
        <span style={styles.metricDescription}>{description}</span>
      )}
      {formula && <span style={styles.metricFormula}>{formula}</span>}
    </div>
  );
}

const styles = {
  appShell: {
    minHeight: "100vh",
    display: "flex",
    background: "#f4f8ef",
    color: "#102018",
    fontFamily:
      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  sidebar: {
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    width: 260,
    background: "#071b11",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    padding: "28px 22px",
    boxSizing: "border-box",
    zIndex: 20,
  },

  sidebarLogoContainer: {
    width: "100%",
    minHeight: 86,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  sidebarLogo: {
    width: "92%",
    maxWidth: 200,
    height: "auto",
    objectFit: "contain",
    display: "block",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 18,
  },

  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 18px",
    borderRadius: 16,
    color: "#eef8e8",
    textDecoration: "none",
    fontWeight: 800,
  },

  navItemActive: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 18px",
    borderRadius: 16,
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: 900,
    background: "#244d13",
  },

  logoutButton: {
    marginTop: "auto",
    width: "100%",
    border: "none",
    borderRadius: 14,
    background: "#263c31",
    color: "#ffffff",
    padding: "14px 16px",
    fontWeight: 900,
    cursor: "pointer",
  },

  mainContent: {
    flex: 1,
    marginLeft: 260,
    padding: "42px 48px",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 24,
    marginBottom: 28,
  },

  pageBadge: {
    display: "inline-flex",
    alignItems: "center",
    background: "#e8f5dc",
    color: "#1d7c19",
    borderRadius: 999,
    padding: "8px 18px",
    fontWeight: 900,
    fontSize: 14,
  },

  pageTitle: {
    fontSize: 38,
    margin: "26px 0 10px",
    letterSpacing: "-0.04em",
  },

  pageSubtitle: {
    margin: 0,
    color: "#5d6a61",
    fontSize: 16,
  },

  userArea: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },

  userCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "#ffffff",
    borderRadius: 24,
    padding: "18px 24px",
    boxShadow: "0 18px 40px rgba(24, 54, 24, 0.08)",
  },

  userIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eef8e8",
    fontSize: 24,
  },

  userLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    color: "#738073",
    fontWeight: 900,
    letterSpacing: "0.08em",
  },

  userName: {
    display: "block",
    fontSize: 17,
  },

  userRole: {
    display: "inline-block",
    marginTop: 4,
    background: "#e8f5dc",
    color: "#1d7c19",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 900,
  },

  notificationButton: {
    width: 62,
    height: 62,
    borderRadius: 22,
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 18px 40px rgba(24, 54, 24, 0.08)",
    fontSize: 24,
  },

  reportContainer: {
    background: "#ffffff",
    borderRadius: 28,
    padding: 36,
    boxShadow: "0 18px 60px rgba(24, 54, 24, 0.08)",
  },

  reportHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
  },

  reportLogo: {
    width: 170,
    height: "auto",
    objectFit: "contain",
  },

  reportMeta: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 6,
    color: "#4d5c50",
  },

  reportDivider: {
    border: "none",
    borderTop: "1px solid #dfe8dc",
    margin: "28px 0",
  },

  reportTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
    marginBottom: 28,
  },

  reportTitle: {
    margin: 0,
    fontSize: 32,
    letterSpacing: "-0.03em",
  },

  reportSubtitle: {
    margin: "10px 0 0",
    color: "#5d6a61",
  },

  printButton: {
    border: "none",
    borderRadius: 16,
    padding: "14px 22px",
    background: "#228b18",
    color: "#ffffff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(34, 139, 24, 0.2)",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 22,
  },

  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
    marginBottom: 18,
  },

  metricCard: {
    border: "1px solid #dfe8dc",
    borderRadius: 16,
    background: "#f8fbf5",
    padding: 18,
    minHeight: 84,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 8,
  },

  metricCardTall: {
    minHeight: 150,
    padding: "24px 20px",
    justifyContent: "space-between",
    gap: 14,
  },

  metricCardFlush: {
    width: "100%",
    height: "100%",
    minHeight: 180,
    border: "none",
    background: "transparent",
    padding: 0,
    boxSizing: "border-box",
  },

  metricLabel: {
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#6b766b",
    fontSize: 12,
    fontWeight: 900,
  },

  metricValue: {
    fontSize: 24,
    color: "#102018",
  },

  metricDescription: {
    color: "#4f5f52",
    fontSize: 12,
    lineHeight: 1.35,
  },

  metricFormula: {
    color: "#6b766b",
    fontSize: 11,
    lineHeight: 1.35,
    fontWeight: 800,
  },

  panel: {
    border: "1px solid #dfe8dc",
    borderRadius: 18,
    background: "#ffffff",
    padding: 24,
  },

  compactPanel: {
    padding: "18px 20px",
  },

  tasaPanel: {
    minHeight: 220,
    display: "flex",
  },

  sectionTitle: {
    margin: "0 0 18px",
    fontSize: 20,
  },

  panelText: {
    margin: "0 0 16px",
    color: "#4f5f52",
    lineHeight: 1.6,
  },

  environmentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 16,
  },

  methodText: {
    margin: "12px 0 0",
    color: "#4f5f52",
    fontSize: 14,
    lineHeight: 1.6,
  },

  unitList: {
    display: "grid",
    gap: 6,
  },

  unitItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #edf2ea",
    padding: "7px 0",
    textTransform: "capitalize",
  },

  quantityMetric: {
    display: "grid",
    gap: 6,
  },

  quantityValue: {
    color: "#102018",
    fontSize: 30,
    lineHeight: 1,
  },

  quantityNote: {
    color: "#4f5f52",
    fontSize: 13,
    lineHeight: 1.4,
  },

  rankingList: {
    display: "grid",
    gap: 10,
  },

  rankingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #edf2ea",
    padding: "10px 0",
    gap: 16,
  },

  rankingType: {
    marginLeft: 6,
    color: "#6b766b",
  },

  monthList: {
    display: "grid",
    gap: 14,
  },

  monthRow: {
    display: "grid",
    gridTemplateColumns: "80px 1fr 36px",
    alignItems: "center",
    gap: 12,
  },

  monthLabel: {
    fontWeight: 900,
    color: "#4f5f52",
  },

  monthBarTrack: {
    height: 12,
    borderRadius: 999,
    background: "#dfe8dc",
    overflow: "hidden",
  },

  monthBarFill: {
    height: "100%",
    borderRadius: 999,
    background: "#228b18",
  },

  monthValue: {
    textAlign: "right",
  },

  reportFooter: {
    borderTop: "1px solid #dfe8dc",
    marginTop: 28,
    paddingTop: 20,
    textAlign: "center",
    color: "#4f5f52",
    fontWeight: 900,
  },

  infoBox: {
    borderRadius: 16,
    padding: 18,
    background: "#eef8e8",
    color: "#1d7c19",
    fontWeight: 800,
  },

  errorBox: {
    borderRadius: 16,
    padding: 18,
    background: "#fdeaea",
    color: "#a32727",
    fontWeight: 800,
  },
};
