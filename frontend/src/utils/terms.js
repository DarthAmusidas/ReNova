export const TERMS_VERSION = "2026-09-25";

const ONG_TYPES = ["Comedor", "Merendero", "Voluntariado"];

export const getTermsAudience = (organizationType) => {
  if (!organizationType) return null;
  return ONG_TYPES.includes(organizationType) ? "ONG" : "SUPERMARKET";
};
