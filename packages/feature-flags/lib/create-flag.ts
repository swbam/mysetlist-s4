import { getUser } from "@repo/auth/server"

export interface Flag {
  key: string
  defaultValue: boolean
  decide(): Promise<boolean>
}

export const createFlag = (key: string, defaultValue = false): Flag => ({
  key,
  defaultValue,
  async decide() {
    try {
      const user = await getUser()

      if (!user?.id) {
        return defaultValue
      }

      // Feature flags now default to the defaultValue without analytics
      // This can be extended with a different feature flag service if needed
      return defaultValue
    } catch (_error) {
      return defaultValue
    }
  },
})
