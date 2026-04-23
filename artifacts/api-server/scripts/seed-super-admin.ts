import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool, usersTable } from "@workspace/db";
import { hashPassword } from "../src/lib/auth";

async function main(): Promise<void> {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      "ERROR: SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD must both be set. No default password is provided.",
    );
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(sql`lower(${usersTable.email}) = lower(${email})`)
    .limit(1);

  if (existing) {
    await db
      .update(usersTable)
      .set({
        passwordHash,
        role: "super_admin",
        status: "active",
        merchantId: null,
        updatedAt: new Date(),
      })
      .where(sql`lower(${usersTable.email}) = lower(${email})`);
    console.log(`Updated super_admin: ${email} (id=${existing.id})`);
  } else {
    const [created] = await db
      .insert(usersTable)
      .values({
        email,
        passwordHash,
        role: "super_admin",
        status: "active",
        merchantId: null,
      })
      .returning({ id: usersTable.id });
    console.log(`Created super_admin: ${email} (id=${created!.id})`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  pool.end().finally(() => process.exit(1));
});
