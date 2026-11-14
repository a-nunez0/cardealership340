import { randomBytes, timingSafeEqual } from "node:crypto";
import { findById } from "../models/users.js";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function loadUser(db) {
  return async (req, res, next) => {
    const id = req.session.userId;
    res.locals.user = id ? (await findById(db, id)) ?? null : null;
    if (id && !res.locals.user) delete req.session.userId;
    if (id || req.method === "POST") res.set("Cache-Control", "no-store");
    next();
  };
}

export function formToken(req, res, next) {
  req.session.csrfToken ??= randomBytes(32).toString("hex");
  res.locals.csrfToken = req.session.csrfToken;
  res.set("Cache-Control", "no-store");
  next();
}

export function verifyFormToken(req, _res, next) {
  const expected = req.session.csrfToken;
  const submitted = req.body?._csrf;
  if (!expected || typeof submitted !== "string" || !/^[a-f0-9]{64}$/.test(submitted)
    || !timingSafeEqual(Buffer.from(expected), Buffer.from(submitted))) {
    throw new HttpError(403, "This form has expired. Reopen the form and try again.");
  }
  next();
}

export function requireUser(req, res, next) {
  if (!res.locals.user) return res.redirect(303, "/login");
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(res.locals.user.role)) {
      throw new HttpError(403, "Your account does not have permission to access this page.");
    }
    next();
  };
}
