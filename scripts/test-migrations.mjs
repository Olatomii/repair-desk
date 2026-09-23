import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";

// Never use the supplied database as a test target. Only newly created,
// randomly named databases on a loopback PostgreSQL server are modified.
const source = new URL(process.env.DATABASE_URL ?? "");
if (!['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)) {
  throw new Error("Migration tests require loopback PostgreSQL with CREATEDB permission.");
}
const admin = new pg.Client({ connectionString: source.toString() });
await admin.connect();
const created = [];

function prisma(url, ...args) {
  const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...args], {
    env: { ...process.env, DATABASE_URL: url, CHECKPOINT_DISABLE: '1' },
    encoding: 'utf8', timeout: 120_000,
  });
  assert.equal(result.status, 0, `${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
}

try {
  for (const existing of [false, true]) {
    const name = `repairdesk_migration_${randomBytes(8).toString('hex')}`;
    await admin.query(`CREATE DATABASE "${name}"`);
    created.push(name);
    const target = new URL(source);
    target.pathname = `/${name}`;
    const url = target.toString();
    if (existing) prisma(url, 'db', 'push');
    else prisma(url, 'migrate', 'deploy');
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    try {
      await client.query('INSERT INTO "City" (id, name, slug, state, "updatedAt", "isActive") VALUES ($1, $2, $1, $2, now(), false)',
        ['baseline-sentinel', 'Baseline Sentinel']);
      if (existing) {
        prisma(url, 'migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code');
        prisma(url, 'migrate', 'resolve', '--applied', '0_init');
      }
      prisma(url, 'migrate', 'deploy');
      prisma(url, 'migrate', 'status');
      prisma(url, 'migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code');
      const data = await client.query('SELECT name, "isActive" FROM "City" WHERE id = $1', ['baseline-sentinel']);
      assert.deepEqual(data.rows, [{ name: 'Baseline Sentinel', isActive: false }]);
      const history = await client.query('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL');
      assert.deepEqual(history.rows, [{ migration_name: '0_init' }]);
      console.log(`${existing ? 'Existing db-push database' : 'Fresh database'}: deploy, schema parity, and data preservation passed.`);
    } finally {
      await client.end();
    }
  }
} finally {
  for (const name of created) await admin.query(`DROP DATABASE "${name}"`);
  await admin.end();
}
