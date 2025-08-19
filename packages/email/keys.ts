import { env } from "@repo/env";

export const keys = () => ({
  RESEND_FROM: process.env.RESEND_FROM,
  RESEND_TOKEN: process.env.RESEND_TOKEN,
  RESEND_API_KEY: env.RESEND_API_KEY || process.env.RESEND_TOKEN,
});
