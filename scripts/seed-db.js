import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { createPool } from "../src/config/db.js";
import { validPassword } from "../src/middleware/validation.js";

const demoPassword = process.env.DEMO_PASSWORD ?? "";
if (demoPassword && !validPassword(demoPassword)) {
  throw new Error("DEMO_PASSWORD must be at least 8 characters and at most 72 bytes.");
}

const listings = [
  {
    category: "Cars", slug: "cars", stock: "CM-101", make: "Toyota", model: "Camry LE",
    mileage: 64750, drivetrain: "FWD", price: 16900,
    description: "A midsize sedan with a roomy cabin and a comfortable automatic transmission.",
    photo: "2019 Toyota Camry LE.jpg", author: "Kevauto",
  },
  {
    category: "Trucks", slug: "trucks", stock: "CM-102", make: "Ford", model: "F-150 Limited",
    mileage: 82120, drivetrain: "4WD", price: 26900,
    description: "A crew-cab pickup with four-wheel drive and plenty of room for passengers and gear.",
    photo: "Ford F-150 Limited 2019.jpg", author: "RL GNZLZ",
  },
  {
    category: "SUVs", slug: "suvs", stock: "CM-103", make: "Subaru", model: "Forester Premium",
    mileage: 72280, drivetrain: "AWD", price: 18450,
    description: "A compact SUV with all-wheel drive, an upright driving position, and a flexible cargo area.",
    photo: "2019 Subaru Forester 2.5i Premium, front 10.6.19.jpg", author: "Kevauto",
  },
  {
    category: "Vans", slug: "vans", stock: "CM-104", make: "Honda", model: "Odyssey EX-L",
    mileage: 79150, drivetrain: "FWD", price: 19800,
    description: "A minivan with three rows of seating and sliding rear doors.",
    photo: "2019 Honda Odyssey EX-L 3.5L front, 4.29.19.jpg", author: "Kevauto",
  },
];

function photoLinks(fileName) {
  const file = fileName.replaceAll(" ", "_");
  const hash = createHash("md5").update(file).digest("hex");
  const encoded = encodeURIComponent(file);
  return {
    image: `https://upload.wikimedia.org/wikipedia/commons/${hash[0]}/${hash.slice(0, 2)}/${encoded}`,
    source: `https://commons.wikimedia.org/wiki/File:${encoded}`,
  };
}

const passwordHash = demoPassword ? await bcrypt.hash(demoPassword, 12) : null;
const db = createPool();

try {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const inventorySeed = await client.query(
      "INSERT INTO seed_history (name) VALUES ($1) ON CONFLICT DO NOTHING RETURNING name",
      ["sample-inventory"],
    );
    if (inventorySeed.rowCount) {
      for (const item of listings) {
        await client.query(
          "INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING",
          [item.category, item.slug],
        );
        const { rows } = await client.query(
          `INSERT INTO vehicles
             (category_id, stock_number, year, make, model, mileage, transmission, drivetrain, price, description, featured)
           SELECT id, $2, 2019, $3, $4, $5, 'Automatic', $6, $7, $8, true
           FROM categories WHERE slug = $1
           ON CONFLICT (stock_number) DO NOTHING RETURNING id`,
          [item.slug, item.stock, item.make, item.model, item.mileage, item.drivetrain, item.price, item.description],
        );
        if (rows.length) {
          const { image, source } = photoLinks(item.photo);
          await client.query(
            "INSERT INTO vehicle_images (vehicle_id, url, alt_text, credit, source_url) VALUES ($1, $2, $3, $4, $5)",
            [rows[0].id, image, `2019 ${item.make} ${item.model}`, `${item.author} · CC BY-SA 4.0`, source],
          );
        }
      }
    }
    if (passwordHash) {
      for (const role of ["owner", "employee", "customer"]) {
        await client.query(
          "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
          [`Demo ${role}`, `${role}@csemotors.example`, passwordHash, role],
        );
      }
    }
    await client.query("COMMIT");
    console.log(passwordHash ? "Sample inventory and demo accounts are ready." : "Sample inventory is ready.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await db.end();
}
