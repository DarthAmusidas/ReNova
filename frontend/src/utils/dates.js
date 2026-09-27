// Las fechas de vencimiento son días calendario ("2026-09-30"). El backend las
// serializa como medianoche UTC, y convertirlas a la hora local (UTC-3) las
// corría un día para atrás. Se toma la parte AAAA-MM-DD literal.
export const parseDateOnly = (value) => {
  if (!value) return null;

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateOnly = (value) => {
  const date = parseDateOnly(value);
  return date ? date.toLocaleDateString("es-AR") : "-";
};
