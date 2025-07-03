// Global type declarations used across packages

import type React from "react";

/// <reference types="react" />
/// <reference types="next" />
/// <reference types="next/types/global" />
/// <reference types="framer-motion" />

declare global {
	// Ensure JSX namespace is available when Biome/TS parses isolated files
	namespace JSX {
		interface IntrinsicElements {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			[elemName: string]: unknown;
		}
	}
}

declare module "*.svg" {
	const content: string;
	export default content;
}

declare module "framer-motion";

declare module "next/link" {
	import * as React from "react";
	export interface LinkProps
		extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
		href: string | URL;
		prefetch?: boolean;
	}
	const Link: React.FC<LinkProps>;
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
}

declare module "react" {
	export * from "react";
}

// drizzle-orm provides types but Deno edge bundler may complain; expose minimal re-export
declare module "drizzle-orm" {
	export * from "@repo/database";
}
