/**
 * Utility to safely handle custom element registration and prevent conflicts
 */

// Track registered custom elements to prevent duplicate registration
const registeredElements = new Set<string>();

/**
 * Safely define a custom element without throwing if it's already defined
 */
export function safeDefineCustomElement(
  name: string,
  constructor: CustomElementConstructor,
  options?: ElementDefinitionOptions
): void {
  if (typeof window === "undefined") {
    // Skip custom element registration on server-side
    return;
  }

  try {
    // Check if element is already registered
    if (registeredElements.has(name) || window.customElements.get(name)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`Custom element '${name}' is already defined, skipping registration.`);
      }
      return;
    }

    // Register the element
    window.customElements.define(name, constructor, options);
    registeredElements.add(name);
    
    if (process.env.NODE_ENV === "development") {
      console.log(`Custom element '${name}' registered successfully.`);
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(`Failed to register custom element '${name}':`, error);
    }
    
    // If the error is about already being defined, track it
    if (error instanceof Error && error.message.includes("already been defined")) {
      registeredElements.add(name);
    }
  }
}

/**
 * Check if a custom element is registered
 */
export function isCustomElementDefined(name: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  
  return registeredElements.has(name) || !!window.customElements.get(name);
}

/**
 * Unregister a custom element (not officially supported but helps with cleanup)
 */
export function unregisterCustomElement(name: string): void {
  registeredElements.delete(name);
  // Note: There's no official way to unregister custom elements
  // This only removes our tracking, the browser still knows about it
}

/**
 * Get all registered custom element names
 */
export function getRegisteredElementNames(): string[] {
  return Array.from(registeredElements);
}

/**
 * Clear our tracking (useful for testing)
 */
export function clearElementTracking(): void {
  registeredElements.clear();
}

/**
 * Initialize custom element safety measures
 * Call this early in your app lifecycle
 */
export function initCustomElementSafety(): void {
  if (typeof window === "undefined") {
    return;
  }

  // Check if we've already initialized to prevent double setup
  if ((window as any).__customElementSafetyInitialized) {
    return;
  }

  // Override the original define method to add safety
  const originalDefine = window.customElements.define;
  
  window.customElements.define = function(
    name: string,
    constructor: CustomElementConstructor,
    options?: ElementDefinitionOptions
  ) {
    try {
      // Check if already defined
      if (window.customElements.get(name)) {
        // Silent handling in production, warn only in development
        if (process.env.NODE_ENV === "development") {
          console.warn(`Custom element '${name}' is already defined, skipping.`);
        }
        registeredElements.add(name);
        return;
      }
      
      originalDefine.call(this, name, constructor, options);
      registeredElements.add(name);
    } catch (error) {
      // Silent error handling in production to prevent console spam
      if (process.env.NODE_ENV === "development") {
        console.error(`Error defining custom element '${name}':`, error);
      }
      
      // If already defined, just track it
      if (error instanceof Error && error.message.includes("already been defined")) {
        registeredElements.add(name);
      }
    }
  };

  // Mark as initialized
  (window as any).__customElementSafetyInitialized = true;
}

// Auto-initialize if running in browser
if (typeof window !== "undefined" && window.customElements) {
  initCustomElementSafety();
}