export function assertEnum(value, allowed, field) {
  if (!allowed.includes(value)) {
    const err = new Error(`Invalid ${field}. Allowed: ${allowed.join(", ")}`);
    err.status = 400;
    throw err;
  }
  return value;
}

export function assertInt(value, field, { min = undefined, max = undefined } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    const err = new Error(`Invalid ${field}. Expected integer.`);
    err.status = 400;
    throw err;
  }
  if (min !== undefined && n < min) {
    const err = new Error(`Invalid ${field}. Must be >= ${min}.`);
    err.status = 400;
    throw err;
  }
  if (max !== undefined && n > max) {
    const err = new Error(`Invalid ${field}. Must be <= ${max}.`);
    err.status = 400;
    throw err;
  }
  return n;
}

export function assertString(value, field, { minLen = 1 } = {}) {
  if (typeof value !== "string") {
    const err = new Error(`Invalid ${field}. Expected string.`);
    err.status = 400;
    throw err;
  }
  const s = value.trim();
  if (s.length < minLen) {
    const err = new Error(`Invalid ${field}. Must be at least ${minLen} chars.`);
    err.status = 400;
    throw err;
  }
  return s;
}

export function optionalString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s.length ? s : null;
}
