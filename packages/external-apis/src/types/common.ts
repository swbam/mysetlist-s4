export type ImportStage =
  | "initializing"
  | "syncing-identifiers"
  | "importing-songs"
  | "importing-shows"
  | "creating-setlists"
  | "completed"
  | "failed";
