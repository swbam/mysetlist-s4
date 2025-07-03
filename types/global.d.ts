// Global type declarations used across packages

import type React from "react";

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
