// Re-export database functionality from the main database package
export {
  db,
  sql,
  eq,
  and,
  or,
  desc,
  asc,
  ilike,
  isNull,
  isNotNull,
  inArray,
} from "@repo/database";
