import crypto from "crypto";
import { getEnv } from "./env";

const ALGORITHM = "aes-256-gcm";

function getKeyBuffer(): Buffer {
  return getEnv().ENCRYPTION_KEY_BUFFER;
}

export function encrypt(text: string | null): string | null {
  if (!text) return text;

  // If it's already encrypted (starts with 'enc:'), don't re-encrypt
  if (text.startsWith("enc:")) return text;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKeyBuffer(), iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // Format: enc:<iv>:<authTag>:<encryptedData>
  return `enc:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(text: string | null): string | null {
  if (!text) return text;
  if (!text.startsWith("enc:")) return text; // Return plaintext if not encrypted

  try {
    const parts = text.split(":");
    if (parts.length !== 4) return text;

    const [, ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, getKeyBuffer(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}
