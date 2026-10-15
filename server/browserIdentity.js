import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, open, readFile } from "node:fs/promises";
import { dirname } from "node:path";

const COOKIE_NAME = "travel_browser_id";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const isBrowserId = (value) => /^[A-Za-z0-9_-]{43}$/u.test(value || "");

export async function loadBrowserCookieSecret({ filePath, configuredSecret = process.env.TRAVEL_BROWSER_COOKIE_SECRET } = {}) {
  if (configuredSecret) {
    if (Buffer.byteLength(configuredSecret, "utf8") < 32) {
      throw new Error("TRAVEL_BROWSER_COOKIE_SECRET must contain at least 32 bytes.");
    }
    return Buffer.from(configuredSecret, "utf8");
  }
  if (!filePath) throw new TypeError("A private browser-cookie secret path is required.");
  await mkdir(dirname(filePath), { recursive: true });
  try {
    const handle = await open(filePath, "wx", 0o600);
    const secret = randomBytes(48);
    try {
      await handle.writeFile(secret.toString("base64url"), "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    return secret;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const stored = (await readFile(filePath, "utf8")).trim();
    const secret = Buffer.from(stored, "base64url");
    if (secret.length >= 32) return secret;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Stored browser-cookie secret is invalid.");
}

function sign(id, secret) {
  return createHmac("sha256", secret).update(id).digest("base64url");
}

function parseCookieHeader(header = "") {
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== COOKIE_NAME) continue;
    return part.slice(separator + 1).trim();
  }
  return "";
}

function verifyCookie(value, secret) {
  const [id, signature, extra] = value.split(".");
  if (extra !== undefined || !isBrowserId(id) || !signature) return null;
  const expected = Buffer.from(sign(id, secret));
  const provided = Buffer.from(signature);
  return expected.length === provided.length && timingSafeEqual(expected, provided) ? id : null;
}

export function createBrowserIdentityMiddleware({ secret, secure = process.env.NODE_ENV === "production" } = {}) {
  if (!Buffer.isBuffer(secret) || secret.length < 32) throw new TypeError("A 32-byte browser-cookie signing secret is required.");
  return (req, res, next) => {
    let browserId = verifyCookie(parseCookieHeader(req.headers.cookie), secret);
    if (!browserId) {
      browserId = randomBytes(32).toString("base64url");
      const value = `${browserId}.${sign(browserId, secret)}`;
      const attributes = [
        `${COOKIE_NAME}=${value}`,
        "Path=/",
        `Max-Age=${MAX_AGE_SECONDS}`,
        "HttpOnly",
        "SameSite=Lax",
      ];
      if (secure) attributes.push("Secure");
      res.setHeader("Set-Cookie", attributes.join("; "));
    }
    req.browserId = browserId;
    next();
  };
}

export const browserIdentityCookieName = COOKIE_NAME;
