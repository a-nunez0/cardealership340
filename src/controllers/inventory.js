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
