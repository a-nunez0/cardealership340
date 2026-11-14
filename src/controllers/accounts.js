import bcrypt from "bcryptjs";
import { promisify } from "node:util";
import { field, passwordField, validEmail, validPassword } from "../middleware/validation.js";
import { createCustomer, findByEmail } from "../models/users.js";

const dummyHash = bcrypt.hashSync("unused login timing value", 12);

async function establishSession(req, id) {
  await promisify(req.session.regenerate.bind(req.session))();
  req.session.userId = id;
  await promisify(req.session.save.bind(req.session))();
}

function showForm(res, mode, values = {}, error = null, status = 200) {
  return res.status(status).render("auth/form", {
    title: mode === "register" ? "Create account" : "Sign in",
    mode, values, error,
  });
}

export function accountRoutes(db, cookieName) {
  return {
    loginPage: (_req, res) => showForm(res, "login"),
    registerPage: (_req, res) => showForm(res, "register"),
    async login(req, res) {
      const email = field(req.body, "email").toLowerCase();
      const password = passwordField(req.body);
      if (!validEmail(email) || !validPassword(password)) {
        return showForm(res, "login", { email }, "Enter a valid email and password.", 422);
      }

      const account = await findByEmail(db, email);
      const matches = await bcrypt.compare(password, account?.password_hash ?? dummyHash);
      if (!account || !matches) {
        return showForm(res, "login", { email }, "Email or password is incorrect.", 401);
      }

      await establishSession(req, account.id);
      return res.redirect(303, "/account");
    },
    async register(req, res) {
      const name = field(req.body, "name");
      const email = field(req.body, "email").toLowerCase();
      const password = passwordField(req.body);
      const values = { name, email };
      if (!name || name.length > 80 || !validEmail(email) || !validPassword(password)) {
        return showForm(res, "register", values,
          "Enter a name, a valid email, and a password with at least 8 characters and at most 72 bytes.", 422);
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const account = await createCustomer(db, { name, email, passwordHash });
      if (!account) {
        return showForm(res, "register", values, "Unable to create this account. Try signing in.", 409);
      }

      await establishSession(req, account.id);
      return res.redirect(303, "/account");
    },
    async logout(req, res) {
      await promisify(req.session.destroy.bind(req.session))();
      res.clearCookie(cookieName, { path: "/" });
      res.redirect(303, "/");
    },
    account: (_req, res) => res.render("auth/account", { title: "My account" }),
  };
}
