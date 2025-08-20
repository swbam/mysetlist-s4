"use client";

import { ImportProgress } from "./ImportProgress";
import type { ComponentProps } from "react";

// A lightweight wrapper to maintain backward compatibility when importing ImportProgressWrapper
export function ImportProgressWrapper(
  props: ComponentProps<typeof ImportProgress>,
) {
  return <ImportProgress {...props} />;
}

export default ImportProgressWrapper;
