// Global type declarations used across packages

/// <reference types="react" />
/// <reference types="next" />
/// <reference types="next/types/global" />
/// <reference types="framer-motion" />

// React compatibility for mixed versions
declare module "react" {
	namespace JSX {
		interface IntrinsicElements {
			[elemName: string]: React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement>,
				HTMLElement
			>;
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
			>;
		}
	}
}

declare module "*.svg" {
	const content: string;
	export default content;
}

declare module "framer-motion" {
	export * from "framer-motion";
}

declare module "next/link" {
	import * as React from "react";
	export interface LinkProps
		extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
		href: string | URL;
		prefetch?: boolean;
	}
	const Link: React.FC<LinkProps>;
	export default Link;
}

declare module "next/image" {
	import * as React from "react";
	type Layout = "fill" | "fixed" | "intrinsic" | "responsive" | undefined;
	export interface ImageProps
		extends React.ImgHTMLAttributes<HTMLImageElement> {
		src: string | StaticImport;
		width?: number;
		height?: number;
		layout?: Layout;
	}
	const Image: React.FC<ImageProps>;
	export default Image;
}

// drizzle-orm provides types but Deno edge bundler may complain; expose minimal re-export
declare module "drizzle-orm" {
	export * from "drizzle-orm";
}

// Deno global for edge functions
declare global {
	namespace Deno {
		interface Env {
			get(key: string): string | undefined;
		}
		const env: Env;
	}
}
