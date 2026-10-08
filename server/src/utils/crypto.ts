import crypto from 'crypto';

// Encryption secret: derived securely from server environment or stable machine-local secret
const ENCRYPTION_SECRET = process.env.TOKEN_ENCRYPTION_SECRET || process.env.GEMINI_API_KEY || 'meetingflow-enterprise-secure-key-2026';
const ALGORITHM = 'aes-256-gcm';
const KEY = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();

/**
 * Encrypt a sensitive token string before saving to database
 */
export function encryptToken(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  // Format: iv:tag:encrypted
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a sensitive token string when needed for server-side API requests
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) return '';
  // Check if encrypted format
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    // If plaintext fallback
    return encryptedData;
  }
  try {
    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt token:', err);
    return '';
  }
}
