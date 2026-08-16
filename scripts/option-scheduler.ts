import { pool } from "@/lib/db";
import { runOptionSettlement } from "@/lib/trading/run-settlement";

const intervalMs = 5 * 60 * 1000;
const lockKey = 814230;
let running = false;

async function run() {
  if (running) return;
  running = true;
  let client;
  try {
    client = await pool.connect();
    const lock = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS locked",
      [lockKey],
    );
    if (!lock.rows[0]?.locked) {
      console.log("Option settlement skipped; another scheduler is running.");
      return;
    }
    const accounts = await client.query<{ id: number }>(
      "SELECT id FROM accounts ORDER BY id",
    );
    let autoSold = 0;
    let settled = 0;
    for (const account of accounts.rows) {
      const result = await runOptionSettlement(account.id);
      autoSold += result.autoSold;
      settled += result.settled.length;
    }
    console.log(`Option settlement completed: ${autoSold} auto-sold, ${settled} settled.`);
  } catch (error) {
    console.error("Option settlement failed:", error);
  } finally {
    if (client) {
      await client.query("SELECT pg_advisory_unlock($1)", [lockKey]).catch(() => null);
      client.release();
    }
    running = false;
  }
}

const timer = setInterval(run, intervalMs);
const shutdown = async () => {
  clearInterval(timer);
  await pool.end();
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
void run();
