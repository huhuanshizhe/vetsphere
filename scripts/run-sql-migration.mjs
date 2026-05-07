import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const FALLBACK_DATABASE_URL_FILES = [
  "scripts/fix-product-categories.mjs",
  "scripts/batch-translate.mjs",
  "scripts/retranslate-focus.mjs",
  "scripts/translate-focus-keyword.mjs",
];

function findDatabaseUrlFromRepo() {
  for (const relativeFile of FALLBACK_DATABASE_URL_FILES) {
    const absoluteFile = path.resolve(process.cwd(), relativeFile);
    if (!fs.existsSync(absoluteFile)) {
      continue;
    }

    const content = fs.readFileSync(absoluteFile, "utf8");
    const match = content.match(/const DATABASE_URL = '([^']+)'/);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function getConnectionString() {
  const directUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (directUrl) {
    return directUrl;
  }

  const fallbackUrl = findDatabaseUrlFromRepo();
  if (fallbackUrl) {
    return fallbackUrl;
  }

  throw new Error(
    "DATABASE_URL not found. Set DATABASE_URL/SUPABASE_DB_URL or keep one of the repository migration scripts with a DATABASE_URL constant."
  );
}

function buildClientConfig(connectionString) {
  const url = new URL(connectionString);
  const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);

  if (isLocal) {
    return { connectionString };
  }

  return {
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  };
}

async function main() {
  const sqlFileArg = process.argv[2];
  if (!sqlFileArg) {
    throw new Error("Usage: node scripts/run-sql-migration.mjs <sql-file>");
  }

  const sqlFilePath = path.resolve(process.cwd(), sqlFileArg);
  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`SQL file not found: ${sqlFilePath}`);
  }

  const sql = fs.readFileSync(sqlFilePath, "utf8");
  const connectionString = getConnectionString();
  const client = new pg.Client(buildClientConfig(connectionString));
  const displayPath = path.relative(process.cwd(), sqlFilePath);

  console.log(`Applying SQL migration: ${displayPath}`);

  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("Migration applied successfully.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});