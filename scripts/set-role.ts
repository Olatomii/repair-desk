import { prisma } from "../src/lib/prisma";
const email = process.argv[2]?.trim().toLowerCase();
const role = process.argv[3]?.trim().toUpperCase();
async function main() {
  if (!email || role !== "OPERATOR") throw new Error("Usage: npm run user:role -- registered@example.com OPERATOR (first operator only)");
  await prisma.$transaction(async tx => {
    if (await tx.user.count({ where: { role: "OPERATOR" } })) throw new Error("An operator already exists. Use /operator/manage for account administration.");
    const user = await tx.user.findUnique({ where: { email }, include: { artisanProfile: true } });
    if (!user || user.artisanProfile) throw new Error("Register a separate client account first. Artisan accounts cannot bootstrap operator access.");
    await tx.user.update({ where: { id: user.id }, data: { role: "OPERATOR" } });
    await tx.session.deleteMany({ where: { userId: user.id } });
  }, { isolationLevel: "Serializable" });
  console.log("Initial operator provisioned. Sign in again to continue.");
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
