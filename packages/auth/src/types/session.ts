export interface SessionData {
  userId: string
  email: string
  role: string
  lastActivity: string
  expiresAt: string
}

export interface SessionOptions {
  maxAge: number
  refreshThreshold: number
  autoRefresh: boolean
}
