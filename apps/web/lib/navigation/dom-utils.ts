/**
 * Safe DOM utilities for navigation components
 * Prevents SSR crashes and provides fallbacks
 */

export const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined"

export const safeDocument = isBrowser ? document : undefined
export const safeWindow = isBrowser ? window : undefined

/**
 * Safely add a class to document.body
 */
export function addBodyClass(className: string): void {
  if (isBrowser && safeDocument?.body) {
    safeDocument.body.classList.add(className)
  }
}

/**
 * Safely remove a class from document.body
 */
export function removeBodyClass(className: string): void {
  if (isBrowser && safeDocument?.body) {
    safeDocument.body.classList.remove(className)
  }
}

/**
 * Safely set body overflow style
 */
export function setBodyOverflow(value: string): void {
  if (isBrowser && safeDocument?.body) {
    safeDocument.body.style.overflow = value
  }
}

/**
 * Safely get element by ID
 */
export function safeGetElementById(id: string): HTMLElement | null {
  if (isBrowser && safeDocument) {
    return safeDocument.getElementById(id)
  }
  return null
}

/**
 * Safely append element to head
 */
export function safeAppendToHead(element: HTMLElement): void {
  if (isBrowser && safeDocument?.head) {
    safeDocument.head.appendChild(element)
  }
}

/**
 * Safely add event listener
 */
export function safeAddEventListener<K extends keyof WindowEventMap>(
  type: K,
  listener: (this: Window, ev: WindowEventMap[K]) => any,
  options?: boolean | AddEventListenerOptions
): () => void {
  if (isBrowser && safeWindow) {
    safeWindow.addEventListener(type, listener, options)
    return () => safeWindow.removeEventListener(type, listener, options)
  }
  return () => {} // No-op cleanup function
}

/**
 * Get window location origin safely
 */
export function getLocationOrigin(): string {
  if (isBrowser && safeWindow?.location) {
    return safeWindow.location.origin
  }
  // Fallback for SSR - you might want to use an environment variable here
  return process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3001"
}
