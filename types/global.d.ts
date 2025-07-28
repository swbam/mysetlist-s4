// Global type declarations used across packages

/// <reference types="react" />
/// <reference types="next" />
/// <reference types="next/types/global" />
/// <reference types="framer-motion" />

// React namespace augmentation for version compatibility
declare module "react" {
  namespace React {
    type ReactNode = import("react").ReactNode
  }

  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >
    }
  }
}

declare global {
  // Ensure JSX namespace is available when Biome/TS parses isolated files
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >
    }
  }

  // React namespace for global access
  namespace React {
    type ReactNode = import("react").ReactNode
    type FC<P = Record<string, unknown>> = import("react").FC<P>
    type Component<
      P = Record<string, unknown>,
      S = Record<string, unknown>,
    > = import("react").Component<P, S>
  }
}

declare module "*.svg" {
  const content: string
  export default content
}

declare module "framer-motion" {
  export * from "framer-motion"
}

declare module "next/link" {
  export interface LinkProps
    extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string | URL
    prefetch?: boolean
  }
  const Link: React.FC<LinkProps>
  export default Link
}

declare module "next/image" {
  import type { StaticImport } from "next/dist/shared/lib/get-img-props"

  type Layout = "fill" | "fixed" | "intrinsic" | "responsive" | undefined
  export interface ImageProps
    extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string | StaticImport
    width?: number
    height?: number
    layout?: Layout
    priority?: boolean
    placeholder?: "blur" | "empty"
    blurDataURL?: string
  }
  const Image: React.FC<ImageProps>
  export default Image
}

// drizzle-orm type compatibility
declare module "drizzle-orm" {
  export * from "drizzle-orm"
}

// Deno global for edge functions
declare global {
  namespace Deno {
    interface Env {
      get(key: string): string | undefined
    }
    const env: Env
  }
}
