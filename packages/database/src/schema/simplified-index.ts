// Simplified schema exports - Core functionality only
// This matches the documented requirements from theset-docs/

export * from "./users";
export * from "./user-profiles";
export * from "./artists";
export * from "./venues";
export * from "./shows";
export * from "./setlists";
export * from "./email-preferences";
export * from "./relations";

// Re-export artistSongs from artists file to avoid circular dependency
export { artistSongs } from "./artists";
