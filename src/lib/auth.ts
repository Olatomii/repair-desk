import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

import { authConfiguration } from "@/lib/auth-config";

export const auth = betterAuth({
  ...authConfiguration(),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "CLIENT",
        input: false,
      },
    },
  },
  advanced: {
    database: {
      joins: true,
    },
  },
});
