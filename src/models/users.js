export async function findByEmail(db, email) {
  const { rows } = await db.query(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [email],
  );
  return rows[0];
}

export async function findById(db, id) {
  const { rows } = await db.query(
    "SELECT id, name, email, role FROM users WHERE id = $1",
    [id],
  );
  return rows[0];
}

export async function createCustomer(db, { name, email, passwordHash }) {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING RETURNING id`,
    [name, email, passwordHash],
  );
  return rows[0];
}
