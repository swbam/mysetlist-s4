import { Resend } from "resend"
import { keys } from "./keys"

// Create a lazy-initialized Resend client
let resendInstance: Resend | null = null

export function getResendClient(): Resend {
  if (!resendInstance) {
    const apiKey = keys().RESEND_API_KEY || "re_dummy_key_for_build"
    resendInstance = new Resend(apiKey)
  }
  return resendInstance
}

// Export keys function
export { keys }

// Re-export all email services and types
export * from "./services"
export type * from "./services"
