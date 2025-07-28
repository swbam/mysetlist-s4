/// <reference types="@testing-library/jest-dom" />

import "@testing-library/jest-dom"

// Extend Vitest matchers with jest-dom matchers
declare module "vitest" {
  interface Assertion<T = any> extends jest.Matchers<void, T> {
    toBeInTheDocument(): void
    toBeDisabled(): void
    toBeEnabled(): void
    toBeVisible(): void
    toHaveClass(className: string | string[]): void
    toHaveTextContent(text: string | RegExp): void
    toHaveAttribute(attr: string, value?: string | RegExp | null): void
    toHaveStyle(css: string | Record<string, any>): void
  }
}
