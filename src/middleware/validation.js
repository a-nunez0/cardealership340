import { HttpError } from "./security.js";

export const availabilityOptions = ["available", "reserved", "sold"];

export function field(body, key) {
  const value = body?.[key];
  return typeof value === "string" && !value.includes("\0") ? value.trim() : "";
}

export function passwordField(body) {
  return typeof body?.password === "string" ? body.password : "";
}

export function validEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validPassword(password) {
  return password.length >= 8 && Buffer.byteLength(password, "utf8") <= 72;
}

export function vehicleId(value) {
  if (!/^[1-9][0-9]{0,9}$/.test(value) || Number(value) > 2147483647) {
    throw new HttpError(404, "Vehicle not found.");
  }
  return Number(value);
}
