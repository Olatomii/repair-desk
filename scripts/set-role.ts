import { prisma } from "../src/lib/prisma";

const email = process.argv[2]?.trim().toLowerCase();
const role = process.argv[3]?.trim().toUpperCase();

if (!email || !["CLIENT", "ARTISAN", "OPERATOR"].includes(role ?? "")) {
  console.error("Usage: npm run user:role -- user@example.com CLIENT|ARTISAN|OPERATOR");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error(`No registered user found for ${email}. Register through the app first.`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: role as "CLIENT" | "ARTISAN" | "OPERATOR" },
  });

  if (role === "ARTISAN") {
    const profile = await prisma.artisanProfile.upsert({
      where: { userId: user.id },
      update: { status: "ACTIVE" },
      create: {
        userId: user.id,
        status: "ACTIVE",
      },
    });

    const [cities, services] = await Promise.all([
      prisma.city.findMany({ where: { isActive: true }, select: { id: true } }),
      prisma.serviceCategory.findMany({
        where: { isActive: true },
        select: { id: true },
      }),
    ]);

    await prisma.artisanCity.createMany({
      data: cities.map((city) => ({
        artisanId: profile.id,
        cityId: city.id,
      })),
      skipDuplicates: true,
    });

    await prisma.artisanService.createMany({
      data: services.map((service) => ({
        artisanId: profile.id,
        serviceId: service.id,
      })),
      skipDuplicates: true,
    });

    console.log(
      `${email} is now an ACTIVE ARTISAN covering all currently active launch cities and services.`,
    );
    return;
  }

  console.log(`${email} role changed to ${role}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
