import "dotenv/config";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

// Validate env config before any DB setup so misconfiguration fails fast,
// including in no-database smoke checks.
const readIntegerEnv = (
  name: string,
  raw: string | undefined
): number | undefined => {
  if (raw === undefined) {
    return undefined;
  }
  const value = Number(raw);
  if (raw.trim() === "" || !Number.isInteger(value)) {
    throw new Error(`${name} must be an integer, received "${raw}".`);
  }
  return value;
};

const shardIndex = readIntegerEnv(
  "TEST_SHARD_INDEX",
  process.env["TEST_SHARD_INDEX"]
);
const shardCount = readIntegerEnv(
  "TEST_SHARD_COUNT",
  process.env["TEST_SHARD_COUNT"]
);

if ((shardIndex === undefined) !== (shardCount === undefined)) {
  throw new Error(
    "TEST_SHARD_INDEX and TEST_SHARD_COUNT must be supplied together or neither."
  );
}
if (shardIndex !== undefined && shardCount !== undefined) {
  if (shardCount < 1) {
    throw new Error(
      `TEST_SHARD_COUNT must be a positive integer, received ${shardCount}.`
    );
  }
  if (shardIndex < 0) {
    throw new Error(
      `TEST_SHARD_INDEX must be a non-negative integer, received ${shardIndex}.`
    );
  }
  if (shardIndex >= shardCount) {
    throw new Error(
      `TEST_SHARD_INDEX (${shardIndex}) must be less than TEST_SHARD_COUNT (${shardCount}).`
    );
  }
}

const configuredSeed = readIntegerEnv(
  "TEST_ORDER_SEED",
  process.env["TEST_ORDER_SEED"]
);
const orderSeed = configuredSeed ?? Math.floor(Math.random() * 4_294_967_296);

const sourceUrl =
  process.env["TEST_DATABASE_URL"] ?? process.env["DATABASE_URL"];
if (!sourceUrl) {
  throw new Error(
    "Set DATABASE_URL or TEST_DATABASE_URL before running backend tests."
  );
}

const testUrl = new URL(sourceUrl);
let databaseName = decodeURIComponent(testUrl.pathname.slice(1));
if (!process.env["TEST_DATABASE_URL"]) {
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(
    testUrl.hostname
  );
  if (!isLocalHost || !databaseName.startsWith("taskora")) {
    throw new Error(
      "Set TEST_DATABASE_URL to a dedicated taskora_test database; refusing to run against a non-local database."
    );
  }
  databaseName = `${databaseName.endsWith("_test") ? databaseName.slice(0, -5) : databaseName}_test`;
  testUrl.pathname = `/${databaseName}`;
}

const hasSafeTestDatabaseName =
  databaseName.startsWith("taskora") &&
  databaseName.endsWith("_test") &&
  [...databaseName].every((character) =>
    "abcdefghijklmnopqrstuvwxyz0123456789_".includes(character)
  );
if (!hasSafeTestDatabaseName) {
  throw new Error(
    "TEST_DATABASE_URL must point to a database named taskora*_test."
  );
}

const adminUrl = new URL(process.env["TEST_DATABASE_ADMIN_URL"] ?? testUrl);
adminUrl.pathname = "/postgres";
const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
try {
  const exists = await adminPool.query<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
    [databaseName]
  );
  if (!exists.rows[0]?.exists) {
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  }
} finally {
  await adminPool.end();
}

const environment = {
  ...process.env,
  BETTER_AUTH_SECRET:
    process.env["TEST_BETTER_AUTH_SECRET"] ??
    "test-only-secret-that-is-at-least-thirty-two-characters",
  BETTER_AUTH_URL: process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000",
  DATABASE_URL: testUrl.toString(),
  TEST_DATABASE_URL: testUrl.toString(),
};

const migration = spawnSync("bun", ["run", "db:migrate"], {
  env: environment,
  stdio: "inherit",
});
if (migration.status !== 0) {
  process.exit(migration.status ?? 1);
}

const verification = spawnSync("bun", ["run", "db:verify"], {
  env: environment,
  stdio: "inherit",
});
if (verification.status !== 0) {
  process.exit(verification.status ?? 1);
}

const testDirectory = fileURLToPath(
  new URL("../tests/backend", import.meta.url)
);
// Small seeded PRNG (mulberry32) so file order is reproducible from the seed.
/* eslint-disable no-bitwise */
const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};
/* eslint-enable no-bitwise */

// Random order lets state leaks surface across runs.
const shuffle = <TItem>(
  items: readonly TItem[],
  random: () => number
): TItem[] => {
  const remaining = [...items];
  const result: TItem[] = [];
  while (remaining.length > 0) {
    const index = Math.floor(random() * remaining.length);
    const [picked] = remaining.splice(index, 1);
    if (picked !== undefined) {
      result.push(picked);
    }
  }
  return result;
};

const allTestFiles = readdirSync(testDirectory)
  .filter((file) => file.endsWith(".test.ts"))
  .toSorted();
const orderedTestFiles = shuffle(allTestFiles, mulberry32(orderSeed));
const testFiles =
  shardIndex === undefined || shardCount === undefined
    ? orderedTestFiles
    : orderedTestFiles.filter(
        (_file, index) => index % shardCount === shardIndex
      );

console.log(`Test order seed: ${orderSeed}`);
console.log(
  `Running ${testFiles.length} backend test file(s)${
    shardIndex === undefined ? "" : ` [shard ${shardIndex}/${shardCount}]`
  }:`
);
for (const file of testFiles) {
  console.log(`  ${file}`);
}

// Tables that legitimately change outside a test's own fixtures: the company
// singleton, auth rate-limit counters, and verification tokens.
const RESIDUE_IGNORED_TABLES = new Set([
  "company_settings",
  "rateLimit",
  "verification",
]);
const residuePool = new Pool({ connectionString: testUrl.toString(), max: 1 });

const countRows = async (): Promise<Map<string, number>> => {
  const tables = await residuePool.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
  );
  const names = tables.rows
    .map(({ table_name: name }) => name)
    .filter((name) => !RESIDUE_IGNORED_TABLES.has(name));
  const counts = await Promise.all(
    names.map(async (name): Promise<readonly [string, number]> => {
      const result = await residuePool.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM "${name}"`
      );
      return [name, result.rows[0]?.count ?? 0];
    })
  );
  return new Map(counts);
};

try {
  for (const testFile of testFiles) {
    // Files run one at a time so each file's row delta is its own.
    // eslint-disable-next-line no-await-in-loop
    const before = await countRows();
    const testRun = spawnSync(
      "bun",
      [
        "test",
        "--max-concurrency=1",
        // 30s covers DB fixture setup (several users created and signed in per
        // file); an accepted exception, not a hidden failure or a retry.
        "--timeout=30000",
        "--preload",
        path.join(testDirectory, "support/server-only-stub.ts"),
        path.join(testDirectory, testFile),
      ],
      { env: environment, stdio: "inherit" }
    );
    if (testRun.status !== 0) {
      process.exit(testRun.status ?? 1);
    }
    // eslint-disable-next-line no-await-in-loop
    const after = await countRows();
    const residue = [...after]
      .filter(([table, count]) => count > (before.get(table) ?? 0))
      .map(([table, count]) => `${table} +${count - (before.get(table) ?? 0)}`);
    if (residue.length > 0 && process.env["ALLOW_TEST_RESIDUE"] !== "1") {
      console.error(
        `${testFile} left rows behind (${residue.join(", ")}). Clean them up in the test's finally block.`
      );
      process.exit(1);
    }
  }
} finally {
  await residuePool.end();
}
