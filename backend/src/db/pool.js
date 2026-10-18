require("dotenv").config({ quiet: true });

const { Pool } = require("pg");

const rawDatabaseUrl = process.env.DATABASE_URL;

if (!rawDatabaseUrl) {
  console.warn("DATABASE_URL no está configurada. Revisá backend/.env");
}

const isLocalDatabase =
  rawDatabaseUrl &&
  (rawDatabaseUrl.includes("localhost") || rawDatabaseUrl.includes("127.0.0.1"));

const buildConnectionString = (databaseUrl) => {
  if (!databaseUrl || isLocalDatabase) {
    return databaseUrl;
  }

  const url = new URL(databaseUrl);

  // Evita que pg-connection-string tome sslmode=require como verify-full.
  // El SSL lo manejamos explícitamente desde la config del Pool.
  url.searchParams.delete("sslmode");
  url.searchParams.delete("ssl");

  return url.toString();
};

// Certificado raíz de Supabase (Project Settings > Database > SSL Configuration).
// Con DATABASE_CA_CERT cargado, la conexión verifica que el servidor sea realmente
// Supabase (evita ataques de intermediario). Sin él, la conexión va cifrada pero
// sin verificar el certificado. En Render el valor puede pegarse con saltos de
// línea reales o como "\n".
const caCert = process.env.DATABASE_CA_CERT
  ? process.env.DATABASE_CA_CERT.replace(/\\n/g, "\n")
  : null;

const buildSslConfig = () => {
  if (!rawDatabaseUrl || isLocalDatabase) return false;

  if (caCert) {
    return { ca: caCert, rejectUnauthorized: true };
  }

  console.warn(
    "DATABASE_CA_CERT no está configurada: la conexión a la base va cifrada pero sin verificar el certificado."
  );
  return { rejectUnauthorized: false };
};

const pool = new Pool({
  connectionString: buildConnectionString(rawDatabaseUrl),
  ssl: buildSslConfig(),
});

module.exports = pool;
