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

const pool = new Pool({
  connectionString: buildConnectionString(rawDatabaseUrl),
  ssl: rawDatabaseUrl && !isLocalDatabase
    ? { rejectUnauthorized: false }
    : false,
});

module.exports = pool;
