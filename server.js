import "dotenv/config";
import createApp from "./src/app.js";
import { createPool } from "./src/config/db.js";

const db = createPool();
db.on("error", (error) => console.error("Unexpected PostgreSQL connection error", error));

const app = createApp({
  db,
  secret: process.env.SESSION_SECRET,
  production: process.env.NODE_ENV === "production",
});
const port = process.env.PORT || 3000;

await db.query("SELECT 1");
app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
