import { readFile } from "node:fs/promises";
import { createPool } from "../src/config/db.js";

const db = createPool();
try {
  await db.query(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  console.log("Database schema is ready.");
} finally {
  await db.end();
}
