import { fileURLToPath } from "node:url";
import connectPgSimple from "connect-pg-simple";
import express from "express";
import rateLimit from "express-rate-limit";
import session from "express-session";
import { accountRoutes } from "./controllers/accounts.js";
import { inventoryRoutes } from "./controllers/inventory.js";
import { formToken, HttpError, loadUser, requireRole, requireUser, verifyFormToken } from "./middleware/security.js";

export default function createApp({ db, secret, production = false }) {
  if (Buffer.byteLength(secret ?? "") < 32) throw new Error("SESSION_SECRET must be at least 32 bytes.");

  const app = express();
  const cookieName = production ? "__Host-dealership.sid" : "dealership.sid";
  const PgStore = connectPgSimple(session);
  const accounts = accountRoutes(db, cookieName);
  const inventory = inventoryRoutes(db);
  const staff = requireRole("owner", "employee");
  const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    skipSuccessfulRequests: true,
    handler: (_req, _res, next) => next(new HttpError(429, "Too many attempts. Please try again later.")),
  });

  app.disable("x-powered-by");
  if (production) app.set("trust proxy", 1);
  app.set("view engine", "ejs");
  app.set("views", fileURLToPath(new URL("./views", import.meta.url)));
  app.locals.user = null;
  app.locals.money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  app.use((_req, res, next) => {
    res.set({
      "Content-Security-Policy": "default-src 'self'; img-src 'self' https://upload.wikimedia.org; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    });
    next();
  });
  app.use(express.static(fileURLToPath(new URL("./public", import.meta.url))));
  app.use(express.urlencoded({ extended: false, limit: "16kb", parameterLimit: 12 }));
  app.use(session({
    name: cookieName,
    secret,
    store: new PgStore({ pool: db, tableName: "user_sessions" }),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: production, sameSite: "lax", maxAge: 8 * 60 * 60 * 1000 },
  }));
  app.use(loadUser(db));

  app.get("/", inventory.home);
  app.get("/vehicles", inventory.browse);
  app.get("/vehicles/category/:category", inventory.browse);
  app.get("/vehicles/:id", inventory.detail);

  app.get("/login", formToken, accounts.loginPage);
  app.post("/login", authLimit, verifyFormToken, formToken, accounts.login);
  app.get("/register", formToken, accounts.registerPage);
  app.post("/register", authLimit, verifyFormToken, formToken, accounts.register);
  app.get("/account", requireUser, formToken, accounts.account);
  app.post("/logout", requireUser, verifyFormToken, accounts.logout);

  app.get("/staff/inventory", requireUser, staff, formToken, inventory.staff);
  app.get("/staff/inventory/:id/edit", requireUser, staff, formToken, inventory.edit);
  app.post("/staff/inventory/:id/edit", requireUser, staff, verifyFormToken, formToken, inventory.update);
  app.post("/staff/inventory/:id/delete", requireUser, requireRole("owner"), verifyFormToken, inventory.remove);

  app.use((_req, _res, next) => next(new HttpError(404, "Page not found.")));
  app.use((error, _req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error instanceof HttpError ? error.status : [400, 413, 415].includes(error.status) ? error.status : 500;
    if (status === 500) console.error(error);
    res.status(status).render("error", {
      title: `Error ${status}`,
      status,
      message: error instanceof HttpError ? error.message
        : status === 500 ? "Something went wrong. Please try again later." : "This request could not be processed.",
    });
  });

  return app;
}
