const listing = `
  SELECT v.*, c.name AS category, photo.url AS image_url, photo.alt_text AS image_alt
  FROM vehicles v
  JOIN categories c ON c.id = v.category_id
  LEFT JOIN LATERAL (
    SELECT url, alt_text FROM vehicle_images
    WHERE vehicle_id = v.id ORDER BY sort_order LIMIT 1
  ) photo ON true
`;

export async function categories(db) {
  const { rows } = await db.query("SELECT name, slug FROM categories ORDER BY name");
  return rows;
}

export async function featured(db) {
  const { rows } = await db.query(
    listing + " WHERE v.featured AND v.availability = 'available' ORDER BY v.id LIMIT 4",
  );
  return rows;
}

export async function browse(db, category = null) {
  const { rows } = await db.query(
    listing + " WHERE ($1::text IS NULL OR c.slug = $1) ORDER BY v.id",
    [category],
  );
  return rows;
}

export async function findVehicle(db, id) {
  const { rows } = await db.query(listing + " WHERE v.id = $1", [id]);
  return rows[0];
}

export async function vehicleImages(db, id) {
  const { rows } = await db.query(
    "SELECT url, alt_text, credit, source_url FROM vehicle_images WHERE vehicle_id = $1 ORDER BY sort_order",
    [id],
  );
  return rows;
}

export async function updateVehicle(db, id, { price, description, availability }) {
  const { rowCount } = await db.query(
    "UPDATE vehicles SET price = $1, description = $2, availability = $3 WHERE id = $4",
    [price, description, availability, id],
  );
  return rowCount === 1;
}

export async function deleteVehicle(db, id) {
  const { rowCount } = await db.query("DELETE FROM vehicles WHERE id = $1", [id]);
  return rowCount === 1;
}
