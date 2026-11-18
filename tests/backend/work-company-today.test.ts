import { expect, it } from "bun:test";

import { authPool } from "../../src/server/auth/database";
import { getCompanyToday } from "../../src/server/work/work-company-today";

// Overdue is judged on the company calendar, not the server's UTC day.
it("reads today on the company time zone", async () => {
  const saved = await authPool.query<{ timeZone: string }>(
    "SELECT \"timeZone\" FROM company_settings WHERE id = 'company'"
  );
  const original = saved.rows[0]?.timeZone;
  const lateUtcEvening = new Date("2026-03-01T20:00:00Z");
  try {
    await authPool.query(
      "UPDATE company_settings SET \"timeZone\" = $1 WHERE id = 'company'",
      ["Pacific/Kiritimati"]
    );
    expect(await getCompanyToday(lateUtcEvening)).toBe("2026-03-02");
    await authPool.query(
      "UPDATE company_settings SET \"timeZone\" = $1 WHERE id = 'company'",
      ["America/Los_Angeles"]
    );
    expect(await getCompanyToday(lateUtcEvening)).toBe("2026-03-01");
  } finally {
    if (original) {
      await authPool.query(
        "UPDATE company_settings SET \"timeZone\" = $1 WHERE id = 'company'",
        [original]
      );
    }
  }
});
