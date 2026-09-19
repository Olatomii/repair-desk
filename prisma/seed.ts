import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.city.upsert({
    where: { slug: "abeokuta" },
    update: {
      name: "Abeokuta",
      state: "Ogun State",
      country: "Nigeria",
      isActive: true,
    },
    create: {
      slug: "abeokuta",
      name: "Abeokuta",
      state: "Ogun State",
      country: "Nigeria",
    },
  });

  const services = [
    {
      slug: "plumbing",
      name: "Plumbing",
      description: "Leaks, blocked drains, taps, pipes, and everyday plumbing repairs.",
      mode: "HOME" as const,
    },
    {
      slug: "phone-repair",
      name: "Phone repair",
      description: "Diagnosis, quote approval, device repair, and recorded handover.",
      mode: "WORKSHOP" as const,
    },
  ];

  for (const service of services) {
    await prisma.serviceCategory.upsert({
      where: { slug: service.slug },
      update: service,
      create: service,
    });
  }

  console.log("Seeded Repair Desk launch city and service categories.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
