import { betterAuth } from "better-auth";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  secret: process.env.BETTER_AUTH_SECRET || "voicely_dev_secret_key_123456789",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});
