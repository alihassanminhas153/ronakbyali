// One-off migration for the order rework. Run AFTER pushing appwrite.config.json:
//   npm run migrate:order-statuses -- --dry-run
//   npm run migrate:order-statuses
// MIGRATE_ORDER_STATUSES_API_KEY in .env needs databases/tables read + write.
//   1. orders.status:  placed -> pending, shipped -> dispatched
//   2. orders.isConfirmed is left as it is (old orders keep their real confirmation state)
// Safe to run twice.
import { Client, TablesDB, Query } from 'node-appwrite';

const config = {
  endpoint: process.env.RONAK_BY_ALI_URL,
  projectId: process.env.RONAK_BY_ALI_PROJECT_ID,
  databaseId: process.env.RONAK_BY_ALI_DATABASE_ID,
  ordersTableId: process.env.RONAK_BY_ALI_ORDERS_TABLE_ID,
  apiKey: process.env.MIGRATE_ORDER_STATUSES_API_KEY || process.env.APPWRITE_API_KEY,
};
const missing = Object.entries(config)
  .filter(([, value]) => !value?.trim())
  .map(([name]) => name);

if (missing.length) {
  throw new Error(`Missing required environment values: ${missing.join(', ')}`);
}

const RENAME = { placed: 'pending', shipped: 'dispatched' };
const dryRun = process.argv.includes('--dry-run');

const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);
const db = new TablesDB(client);

let changed = 0;
for (const [from, to] of Object.entries(RENAME)) {
  if (dryRun) {
    const res = await db.listRows({
      databaseId: config.databaseId,
      tableId: config.ordersTableId,
      queries: [Query.equal('status', from), Query.limit(1)],
    });
    console.log(`${from} -> ${to}: ${res.total ?? res.rows.length} order(s) would be updated`);
    continue;
  }

  for (;;) {
    const res = await db.listRows({
      databaseId: config.databaseId,
      tableId: config.ordersTableId,
      queries: [Query.equal('status', from), Query.limit(100)],
    });
    if (!res.rows.length) break;
    for (const row of res.rows) {
      await db.updateRow({
        databaseId: config.databaseId,
        tableId: config.ordersTableId,
        rowId: row.$id,
        data: { status: to },
      });
      changed += 1;
    }
  }
  console.log(`${from} -> ${to}: done`);
}
console.log(dryRun ? 'Dry run complete; no orders were changed.' : `Updated ${changed} order(s).`);