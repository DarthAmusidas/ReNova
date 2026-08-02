import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardSummary } from "../services/dashboardService";
import AppSidebar from "../components/AppSidebar";
import HeaderUserCard from "../components/HeaderUserCard";

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
  const value = String(unit || "").trim().toLowerCase();

  if (!value) return "sin unidad informada";

  if (["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(value)) {
    return "kilos";
  }

  if (["unidad", "unidades", "u", "ud", "uds"].includes(value)) {
    return "unidades";
  }

  if (["caja", "cajas"].includes(value)) return "cajas";
  if (["paquete", "paquetes"].includes(value)) return "paquetes";
  if (["bolsa", "bolsas"].includes(value)) return "bolsas";
  if (["litro", "litros", "l"].includes(value)) return "litros";

  return value;
};

const formatNumber = (value, suffix = "") => {
  const number = toNumber(value);

  const formatted = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
  }).format(number);

  return suffix ? `${formatted} ${suffix}` : formatted;
};

const formatPercent = (value) => `${formatNumber(value)} %`;

const getStoredUser = () => {
  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
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

function ImpactIcon({ type }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (type === "products") {
    return (
      <svg {...commonProps}>
        <path d="M21 8.5 12 3 3 8.5" />
        <path d="M21 8.5v7L12 21l-9-5.5v-7" />
        <path d="M12 12 3 8.5" />
        <path d="M12 12l9-3.5" />
        <path d="M12 12v9" />
      </svg>
    );
  }

  if (type === "calendar") {
    return (
      <svg {...commonProps}>
        <rect x="4" y="5" width="16" height="16" rx="3" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M4 10h16" />
        <path d="m9 15 2 2 4-4" />
      </svg>
    );
  }

  if (type === "check") {
    return (
      <svg {...commonProps}>
        <path d="M20 6 9 17l-5-5" />
        <path d="M21 12a9 9 0 1 1-6.7-8.7" />
      </svg>
    );
  }

  if (type === "users") {
    return (
      <svg {...commonProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      </svg>
    );
  }

  if (type === "rate") {
    return (
      <svg {...commonProps}>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </svg>
    );
  }

  if (type === "pie") {
    return (
      <svg {...commonProps}>
        <path d="M21 12a9 9 0 1 1-9-9v9z" />
        <path d="M21 12a9 9 0 0 0-9-9" />
      </svg>
    );
  }

  if (type === "leaf") {
    return (
      <svg {...commonProps}>
        <path d="M11 20A7 7 0 0 1 4 13c0-7 7-10 16-10 0 9-3 16-10 16" />
        <path d="M4 20c4-4 8-7 16-17" />
      </svg>
    );
  }

  if (type === "print") {
    return (
      <svg {...commonProps}>
        <path d="M6 9V3h12v6" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="7" rx="1" />
      </svg>
    );
  }

  return null;
}

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

  const canViewReport =
    String(user?.role || "").toUpperCase() === "SUPERMARKET" ||
    String(user?.role || "").toUpperCase() === "ADMIN";

  const completed = toNumber(report.completed_reservations);
  const pending = toNumber(report.pending_reservations);
  const cancelled = toNumber(report.cancelled_reservations);
  const received = toNumber(report.total_reservations_received);
  const unclassified = Math.max(0, received - completed - pending - cancelled);

  const distributionTotal = Math.max(completed + pending + cancelled, received, 1);

  const completedPercent = (completed / distributionTotal) * 100;
  const pendingPercent = (pending / distributionTotal) * 100;
  const cancelledPercent = (cancelled / distributionTotal) * 100;
  const unclassifiedPercent = (unclassified / distributionTotal) * 100;

  const completedDeg = (completedPercent / 100) * 360;
  const pendingDeg = (pendingPercent / 100) * 360;
  const cancelledDeg = (cancelledPercent / 100) * 360;

  const donutGradient = `conic-gradient(
    #37a62d 0deg ${completedDeg}deg,
    #f0b742 ${completedDeg}deg ${completedDeg + pendingDeg}deg,
    #d6453d ${completedDeg + pendingDeg}deg ${completedDeg + pendingDeg + cancelledDeg}deg,
    rgba(160, 210, 140, 0.18) ${completedDeg + pendingDeg + cancelledDeg}deg 360deg
  )`;

  const utilization = Math.min(100, Math.max(0, toNumber(report.utilization_rate)));
  const utilizationDeg = (utilization / 100) * 360;

  const summaryCards = [
    {
      label: "Productos publicados",
      value: formatNumber(report.total_products_published),
      icon: "products",
    },
    {
      label: "Reservas recibidas",
      value: formatNumber(report.total_reservations_received),
      icon: "calendar",
    },
    {
      label: "Reservas completadas",
      value: formatNumber(report.completed_reservations),
      icon: "check",
    },
    {
      label: "ONG beneficiadas",
      value: formatNumber(report.distinct_ongs_helped),
      icon: "users",
    },
    {
      label: "Cantidad entregada",
      value: formatNumber(totalQuantityDelivered),
      icon: "products",
    },
  ];

  return (
    <div className="renova-app-shell">
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 14mm;
            }

            body * {
              visibility: hidden !important;
            }

            .impact-report-print-area,
            .impact-report-print-area * {
              visibility: visible !important;
            }

            .no-print {
              display: none !important;
            }

            .impact-report-print-area {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: #ffffff !important;
              color: #102018 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }

            .impact-report-print-area section,
            .impact-report-print-area article,
            .impact-report-print-area table {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}
      </style>

      <AppSidebar
        active="impact"
        user={user}
        isAdmin={isAdmin}
        navigate={navigate}
        onLogout={handleLogout}
      />

      <main className="renova-impact-main">
        <header className="renova-impact-header no-print">
          <div>
            <span className="renova-section-badge">Reporte</span>
            <h1>Reporte de <span>impacto</span></h1>
            <p>
              Indicadores calculados a partir de productos publicados y reservas
              completadas.
            </p>
          </div>

          <div className="renova-impact-header-right">
            <HeaderUserCard user={user} />
          </div>
        </header>

        <section className="renova-impact-report-card">
          {loading && (
            <div className="renova-impact-info-box">
              Cargando reporte de impacto...
            </div>
          )}

          {!loading && error && (
            <div className="renova-impact-error-box">{error}</div>
          )}

          {!loading && !error && !canViewReport && (
            <div className="renova-impact-info-box">
              El reporte de impacto está disponible para supermercados y
              administradores.
            </div>
          )}

          {!loading && !error && canViewReport && (
            <>
              <section className="renova-impact-summary-grid">
                {summaryCards.map((card) => (
                  <MetricCard
                    key={card.label}
                    label={card.label}
                    value={card.value}
                    icon={card.icon}
                  />
                ))}
              </section>

              <section className="renova-impact-visual-grid">
                <article className="renova-impact-visual-card">
                  <div className="renova-impact-panel-title">
                    <span>
                      <ImpactIcon type="rate" />
                    </span>

                    <h3>Tasa de aprovechamiento</h3>
                  </div>

                  <div className="renova-impact-utilization-layout">
                    <div
                      className="renova-impact-progress-ring"
                      style={{
                        background: `conic-gradient(#46d94d 0deg ${utilizationDeg}deg, rgba(255,255,255,0.08) ${utilizationDeg}deg 360deg)`,
                      }}
                    >
                      <div>
                        <strong>{formatPercent(report.utilization_rate)}</strong>
                        <span>Aprovechamiento</span>
                      </div>
                    </div>

                    <div className="renova-impact-visual-copy">
                      <p>
                        Porcentaje de reservas recibidas que finalizaron como
                        entregas completadas.
                      </p>

                      <div className="renova-impact-progress-track">
                        <div style={{ width: `${utilization}%` }} />
                      </div>

                      <div className="renova-impact-progress-scale">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  <div className="renova-impact-formula-box">
                    Fórmula: completadas ÷ recibidas × 100.
                  </div>
                </article>

                <article className="renova-impact-visual-card">
                  <div className="renova-impact-panel-title">
                    <span>
                      <ImpactIcon type="pie" />
                    </span>

                    <h3>Distribución de reservas</h3>
                  </div>

                  <div className="renova-impact-donut-layout">
                    <div
                      className="renova-impact-donut"
                      style={{ background: donutGradient }}
                    >
                      <div>
                        <span>Total</span>
                        <strong>{distributionTotal}</strong>
                      </div>
                    </div>

                    <div className="renova-impact-chart-legend">
                      <LegendItem
                        tone="green"
                        label="Completadas"
                        value={completed}
                        percent={completedPercent}
                      />
                      <LegendItem
                        tone="yellow"
                        label="Pendientes"
                        value={pending}
                        percent={pendingPercent}
                      />
                      <LegendItem
                        tone="red"
                        label="Canceladas"
                        value={cancelled}
                        percent={cancelledPercent}
                      />

                      {unclassified > 0 && (
                        <LegendItem
                          tone="muted"
                          label="Sin clasificar"
                          value={unclassified}
                          percent={unclassifiedPercent}
                        />
                      )}
                    </div>
                  </div>

                  <div className="renova-impact-formula-box">
                    Basado en reservas recibidas.
                  </div>
                </article>

                <article className="renova-impact-visual-card">
                  <div className="renova-impact-panel-title">
                    <span>
                      <ImpactIcon type="leaf" />
                    </span>

                    <div>
                      <h3>Impacto ambiental estimado</h3>
                      <p>
                        Estimaciones referenciales calculadas a partir de
                        reservas completadas.
                      </p>
                    </div>
                  </div>

                  <div className="renova-impact-environment-grid">
                    <EnvironmentMetric
                      label="Kg de comida recuperada"
                      value={formatNumber(
                        roundMetric(effectiveKgRecovered),
                        "kg"
                      )}
                      helper="Alimentos recuperados y entregados."
                    />

                    <EnvironmentMetric
                      label="CO₂ evitado estimado"
                      value={formatNumber(
                        roundMetric(effectiveCo2Avoided),
                        "kg CO₂e"
                      )}
                      helper="Emisiones evitadas gracias a la recuperación."
                    />
                  </div>

                  <div className="renova-impact-formula-box">
                    {CO2_METHOD_TEXT}
                  </div>
                </article>
              </section>

              <section className="renova-impact-two-column-grid renova-impact-secondary-grid">
                <article className="renova-impact-panel">
                  <h3>Top ONG beneficiadas</h3>

                  {report.top_ongs.length > 0 ? (
                    <div className="renova-impact-ranking-list">
                      {report.top_ongs.map((ong) => (
                        <div key={ong.id || ong.name}>
                          <div>
                            <strong>{ong.name || "ONG sin nombre"}</strong>
                            {ong.organization_type && (
                              <span>{ong.organization_type}</span>
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
                    <p>Todavía no hay datos suficientes.</p>
                  )}
                </article>

                <article className="renova-impact-panel">
                  <h3>Entregas completadas por mes</h3>

                  {report.monthly_completed_deliveries.length > 0 ? (
                    <div className="renova-impact-month-list">
                      {report.monthly_completed_deliveries.map((item) => {
                        const value = toNumber(item.completed_deliveries);
                        const maxMonthValue = Math.max(
                          ...report.monthly_completed_deliveries.map((month) =>
                            toNumber(month.completed_deliveries)
                          ),
                          1
                        );
                        const width = Math.max(
                          6,
                          Math.round((value / maxMonthValue) * 100)
                        );

                        return (
                          <div key={item.month} className="renova-impact-month-row">
                            <span>{item.month}</span>

                            <div>
                              <div style={{ width: `${width}%` }} />
                            </div>

                            <strong>{value}</strong>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p>Todavía no hay entregas completadas por mes.</p>
                  )}
                </article>
              </section>
              <section className="renova-impact-actions no-print">
                <div>
                  <strong>Reporte imprimible</strong>
                  <p>
                    Generá un informe completo con resumen ejecutivo,
                    indicadores, distribución de reservas, impacto ambiental,
                    ONG beneficiadas y entregas por mes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="renova-impact-print-button"
                >
                  <ImpactIcon type="print" />
                  Imprimir reporte
                </button>
              </section>

              <footer className="renova-impact-report-footer">
                Reporte generado por ReNova
              </footer>
            </>
          )}
        </section>

        <section className="impact-report-print-area renova-impact-print-report">
          <header className="renova-print-header">
            <div>
              <h1>Reporte de impacto ReNova</h1>
              <p>
                Indicadores calculados a partir de productos publicados y
                reservas completadas.
              </p>
            </div>

            <div>
              <strong>{user?.name || "Usuario"}</strong>
              <span>Rol: {role || "Usuario"}</span>
              <span>Generado: {new Date().toLocaleString("es-AR")}</span>
            </div>
          </header>

          {!loading && !error && canViewReport && (
            <>
              <section className="renova-print-section renova-print-summary">
                <h2>Resumen ejecutivo</h2>

                <p>
                  La organización registró <strong>{formatNumber(report.total_products_published)}</strong>{" "}
                  productos publicados, <strong>{formatNumber(report.total_reservations_received)}</strong>{" "}
                  reservas recibidas y <strong>{formatNumber(report.completed_reservations)}</strong>{" "}
                  reservas completadas. El nivel de aprovechamiento actual es de{" "}
                  <strong>{formatPercent(report.utilization_rate)}</strong>.
                </p>

                <p>
                  En términos de impacto ambiental estimado, se recuperaron{" "}
                  <strong>{formatNumber(roundMetric(effectiveKgRecovered), "kg")}</strong>{" "}
                  de comida y se evitaron aproximadamente{" "}
                  <strong>{formatNumber(roundMetric(effectiveCo2Avoided), "kg CO₂e")}</strong>.
                </p>
              </section>

              <section className="renova-print-section">
                <h2>Indicadores principales</h2>

                <table className="renova-print-table">
                  <tbody>
                    <tr>
                      <th>Productos publicados</th>
                      <td>{formatNumber(report.total_products_published)}</td>
                    </tr>
                    <tr>
                      <th>Reservas recibidas</th>
                      <td>{formatNumber(report.total_reservations_received)}</td>
                    </tr>
                    <tr>
                      <th>Reservas completadas</th>
                      <td>{formatNumber(report.completed_reservations)}</td>
                    </tr>
                    <tr>
                      <th>ONG beneficiadas</th>
                      <td>{formatNumber(report.distinct_ongs_helped)}</td>
                    </tr>
                    <tr>
                      <th>Cantidad entregada</th>
                      <td>{formatNumber(totalQuantityDelivered)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="renova-print-section">
                <h2>Distribución de reservas</h2>

                <table className="renova-print-table">
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th>Cantidad</th>
                      <th>Participación</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td>Completadas</td>
                      <td>{formatNumber(completed)}</td>
                      <td>{formatPercent(completedPercent)}</td>
                    </tr>
                    <tr>
                      <td>Pendientes</td>
                      <td>{formatNumber(pending)}</td>
                      <td>{formatPercent(pendingPercent)}</td>
                    </tr>
                    <tr>
                      <td>Canceladas</td>
                      <td>{formatNumber(cancelled)}</td>
                      <td>{formatPercent(cancelledPercent)}</td>
                    </tr>
                    {unclassified > 0 && (
                      <tr>
                        <td>Sin clasificar</td>
                        <td>{formatNumber(unclassified)}</td>
                        <td>{formatPercent(unclassifiedPercent)}</td>
                      </tr>
                    )}
                    <tr>
                      <th>Total recibido</th>
                      <th>{formatNumber(distributionTotal)}</th>
                      <th>100 %</th>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="renova-print-section">
                <h2>Tasa de aprovechamiento</h2>

                <div className="renova-print-highlight">
                  <strong>{formatPercent(report.utilization_rate)}</strong>
                  <span>
                    Porcentaje de reservas recibidas que finalizaron como
                    entregas completadas.
                  </span>
                </div>

                <p className="renova-print-note">
                  Fórmula: reservas completadas ÷ reservas recibidas × 100.
                </p>
              </section>

              <section className="renova-print-section">
                <h2>Impacto ambiental estimado</h2>

                <table className="renova-print-table">
                  <tbody>
                    <tr>
                      <th>Kg de comida recuperada</th>
                      <td>{formatNumber(roundMetric(effectiveKgRecovered), "kg")}</td>
                    </tr>
                    <tr>
                      <th>CO₂ evitado estimado</th>
                      <td>{formatNumber(roundMetric(effectiveCo2Avoided), "kg CO₂e")}</td>
                    </tr>
                    <tr>
                      <th>Factor CO₂ utilizado</th>
                      <td>{formatNumber(co2Factor, "kg CO₂e por kg recuperado")}</td>
                    </tr>
                  </tbody>
                </table>

                <p className="renova-print-note">{CO2_METHOD_TEXT}</p>
              </section>

              <section className="renova-print-section">
                <h2>Top ONG beneficiadas</h2>

                {report.top_ongs.length > 0 ? (
                  <table className="renova-print-table">
                    <thead>
                      <tr>
                        <th>ONG</th>
                        <th>Tipo</th>
                        <th>Reservas completadas</th>
                      </tr>
                    </thead>

                    <tbody>
                      {report.top_ongs.map((ong) => (
                        <tr key={ong.id || ong.name}>
                          <td>{ong.name || "ONG sin nombre"}</td>
                          <td>{ong.organization_type || "-"}</td>
                          <td>{formatNumber(ong.completed_reservations)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="renova-print-note">
                    Todavía no hay datos suficientes.
                  </p>
                )}
              </section>

              <section className="renova-print-section">
                <h2>Entregas completadas por mes</h2>

                {report.monthly_completed_deliveries.length > 0 ? (
                  <table className="renova-print-table">
                    <thead>
                      <tr>
                        <th>Mes</th>
                        <th>Entregas completadas</th>
                      </tr>
                    </thead>

                    <tbody>
                      {report.monthly_completed_deliveries.map((item) => (
                        <tr key={item.month}>
                          <td>{item.month}</td>
                          <td>{formatNumber(item.completed_deliveries)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="renova-print-note">
                    Todavía no hay entregas completadas por mes.
                  </p>
                )}
              </section>

              <footer className="renova-print-footer">
                Reporte generado por ReNova
              </footer>
            </>
          )}
        </section>

      </main>
    </div>
  );
}

function MetricCard({ label, value, icon }) {
  return (
    <article className="renova-impact-metric-card">
      <span className="renova-impact-metric-icon">
        <ImpactIcon type={icon} />
      </span>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function LegendItem({ tone, label, value, percent }) {
  return (
    <div className="renova-impact-legend-item">
      <span className={`renova-impact-legend-dot ${tone}`} />
      <div>
        <strong>{label}</strong>
        <small>
          {formatNumber(value)} ({formatNumber(percent)}%)
        </small>
      </div>
    </div>
  );
}

function EnvironmentMetric({ label, value, helper }) {
  return (
    <article className="renova-impact-environment-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
      <div>
        <span />
      </div>
    </article>
  );
}
