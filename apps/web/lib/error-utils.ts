// Error handling utilities
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = "AppError"
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === "string") {
    return error
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message)
  }
  return "An unexpected error occurred"
}

export function getErrorCode(error: unknown): string | undefined {
  if (isAppError(error)) {
    return error.code
  }
  if (error && typeof error === "object" && "code" in error) {
    return String(error.code)
  }
  return undefined
}

export function handleApiError(error: unknown): Response {
  const message = getErrorMessage(error)
  const code = getErrorCode(error)
  const statusCode = isAppError(error) ? error.statusCode || 500 : 500

  return new Response(
    JSON.stringify({
      error: message,
      code,
      statusCode,
      timestamp: new Date().toISOString(),
    }),
    {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    }
  )
}
