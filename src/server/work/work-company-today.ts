import { db } from "@/src/prisma/db";

import { companyToday } from "../budgets/budget-math";

const DEFAULT_TIME_ZONE = "UTC";

export const getCompanyTimeZone = async (): Promise<string> => {
  const settings = await db.orm.public.CompanySettings.where({ id: "company" })
    .select("timeZone")
    .first();
  return settings?.timeZone ?? DEFAULT_TIME_ZONE;
};

// Today's date on the company calendar (company settings time zone).
export const getCompanyToday = async (
  now: Date = new Date()
): Promise<string> => companyToday(now, await getCompanyTimeZone());
