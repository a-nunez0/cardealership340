import * as inventory from "../models/inventory.js";
import { HttpError } from "../middleware/security.js";
import { availabilityOptions, field, vehicleId } from "../middleware/validation.js";

export function inventoryRoutes(db) {
  async function getVehicle(rawId) {
    const vehicle = await inventory.findVehicle(db, vehicleId(rawId));
    if (!vehicle) throw new HttpError(404, "Vehicle not found.");
    return vehicle;
  }

  function editPage(res, vehicle, values = vehicle, error = null, status = 200) {
    return res.status(status).render("staff/edit", {
      title: "Edit vehicle", vehicle, values, error, availabilityOptions,
    });
  }

  return {
    async home(_req, res) {
      const [vehicles, categories] = await Promise.all([inventory.featured(db), inventory.categories(db)]);
      res.render("inventory/home", { title: "Home", vehicles, categories });
    },
    async browse(req, res) {
      const categories = await inventory.categories(db);
      const selected = req.params.category ?? null;
      if (selected && !categories.some(({ slug }) => slug === selected)) {
        throw new HttpError(404, "Category not found.");
      }
      const vehicles = await inventory.browse(db, selected);
      const title = categories.find(({ slug }) => slug === selected)?.name ?? "Inventory";
      res.render("inventory/browse", { title, vehicles, categories, selected });
    },
    async detail(req, res) {
      const vehicle = await getVehicle(req.params.id);
      const images = await inventory.vehicleImages(db, vehicle.id);
      res.render("inventory/detail", { title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`, vehicle, images });
    },
    async newPage(_req, res) {
      const categories = await inventory.staffCategories(db);
      res.render("staff/new", { title: "Add vehicle", categories, values: {}, error: null });
    },
    async create(req, res) {
      const keys = ["category_id", "stock_number", "year", "make", "model", "mileage", "transmission", "drivetrain", "price", "description"];
      const v = Object.fromEntries(keys.map(k => [k, field(req.body, k)]));
      v.featured = req.body.featured === "on";
      const categories = await inventory.staffCategories(db);
      const valid = categories.some(c => String(c.id) === v.category_id)
        && /^[A-Za-z0-9-]{1,20}$/.test(v.stock_number)
        && /^\\d{4}$/.test(v.year) && Number(v.year) >= 1886 && Number(v.year) <= 2100
        && v.make.length > 0 && v.make.length <= 60 && v.model.length > 0 && v.model.length <= 60
        && /^\\d{1,9}$/.test(v.mileage) && Number(v.mileage) <= 2147483647
        && v.transmission.length > 0 && v.transmission.length <= 30
        && v.drivetrain.length > 0 && v.drivetrain.length <= 20
        && /^\\d{1,8}(\\.\\d{1,2})?$/.test(v.price) && Number(v.price) > 0
        && v.description.length > 0 && v.description.length <= 2000;
      if (!valid) return res.status(422).render("staff/new", { title: "Add vehicle", categories, values: v, error: "Please check all fields and try again." });
      try {
        await inventory.createVehicle(db, v);
      } catch (error) {
        if (error.code === "23505") return res.status(422).render("staff/new", { title: "Add vehicle", categories, values: v, error: "That stock number is already in use." });
        throw error;
      }
      res.redirect(303, "/staff/inventory");
    },
    async addCategory(req, res) {
      const name = field(req.body, "name");
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!name || name.length > 50 || !slug || slug.length > 50) throw new HttpError(422, "Enter a valid category name (up to 50 characters).");
      const result = await inventory.createCategory(db, name, slug);
      if (!result) throw new HttpError(409, "That category already exists.");
      res.redirect(303, "/staff/inventory");
    },
    async staff(_req, res) {
      const vehicles = await inventory.browse(db);
      res.render("staff/index", { title: "Manage inventory", vehicles });
    },
    async edit(req, res) {
      return editPage(res, await getVehicle(req.params.id));
    },
    async update(req, res) {
      const vehicle = await getVehicle(req.params.id);
      const price = field(req.body, "price");
      const description = field(req.body, "description");
      const availability = field(req.body, "availability");
      const values = { price, description, availability };
      if (!/^\d{1,8}(\.\d{1,2})?$/.test(price) || Number(price) <= 0
        || !description || description.length > 2000 || !availabilityOptions.includes(availability)) {
        return editPage(res, vehicle, values, "Enter a positive price, a description, and a valid availability.", 422);
      }
      if (!(await inventory.updateVehicle(db, vehicle.id, values))) {
        throw new HttpError(404, "Vehicle not found.");
      }
      res.redirect(303, "/staff/inventory");
    },
    async remove(req, res) {
      if (!(await inventory.deleteVehicle(db, vehicleId(req.params.id)))) {
        throw new HttpError(404, "Vehicle not found.");
      }
      res.redirect(303, "/staff/inventory");
    },
  };
}
