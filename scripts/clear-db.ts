import { Database } from "bun:sqlite";

const dbPath = process.env.DB_PATH || "./data/app.db";

async function clear() {
  const db = new Database(dbPath);
  try {
    db.exec("BEGIN;");
    try {
      db.exec("DELETE FROM feedback;");
    } catch {}
    try {
      db.exec("DELETE FROM merge_requests;");
    } catch {}
    try {
      db.exec("DELETE FROM sqlite_sequence WHERE name IN ('feedback','merge_requests');");
    } catch {}
    db.exec("COMMIT;");
    console.log(`Cleared data in ${dbPath}`);
  } catch (err) {
    try { db.exec("ROLLBACK;"); } catch {}
    console.error("Failed to clear DB:", (err as Error).message);
    process.exit(1);
  } finally {
    db.close();
  }
}

clear();
