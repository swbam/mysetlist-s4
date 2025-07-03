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
	const Link: React.ComponentType<any>;
	export default Link;
}

declare module "next/image" {
	import * as React from "react";
	const Image: React.ComponentType<any>;
	export default Image;
}

declare module "react" {
	export * from "react";
}
