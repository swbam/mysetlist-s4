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
