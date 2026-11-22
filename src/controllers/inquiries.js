import { HttpError } from "../middleware/security.js";

const forms = {
  contact: { title: "Contact us", heading: "Contact CSE Motors", description: "Questions about a vehicle? Send us a message.", button: "Send message" },
  service: { title: "Service request", heading: "Request vehicle service", description: "Tell us what your vehicle needs and we will review your request.", button: "Submit request" },
};

export function inquiryRoutes(db) {
  function page(res, kind, values = {}, error = null, success = false, status = 200) {
    return res.status(status).render("inquiries/form", { ...forms[kind], kind, values, error, success });
  }
  return {
    contact(_req, res) { return page(res, "contact"); },
    service(_req, res) { return page(res, "service"); },
    async submit(req, res) {
      const kind = req.path === "/contact" ? "contact" : "service";
      const value = (name, max) => typeof req.body[name] === "string" ? req.body[name].trim().slice(0, max + 1) : "";
      const values = { name: value("name", 80), email: value("email", 254), phone: value("phone", 30), vehicle: value("vehicle", 120), message: value("message", 2000) };
      if (!values.name || values.name.length > 80 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(values.email) || values.email.length > 254 ||
        values.phone.length > 30 || values.vehicle.length > 120 || !values.message || values.message.length > 2000 ||
        (kind === "service" && !values.vehicle)) {
        return page(res, kind, values, "Please enter your name, a valid email, and a message. Service requests also need vehicle details.", false, 422);
      }
      await db.query(
        "INSERT INTO inquiries (kind, name, email, phone, vehicle, message) VALUES ($1, $2, $3, $4, $5, $6)",
        [kind, values.name, values.email.toLowerCase(), values.phone || null, kind === "service" ? values.vehicle : null, values.message]
      );
      return page(res, kind, {}, null, true, 200);
    },
  };
}
