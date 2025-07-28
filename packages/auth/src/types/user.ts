export interface UserProfile {
  id: string
  email: string
  displayName?: string
  avatar?: string
  bio?: string
  location?: string
  website?: string
  spotifyConnected: boolean
  spotifyUserId?: string
  role: "user" | "moderator" | "admin"
  createdAt: string
  updatedAt: string
}

export interface UserPreferences {
  theme: "light" | "dark" | "system"
  emailNotifications: boolean
  pushNotifications: boolean
  language: string
  timezone: string
}
