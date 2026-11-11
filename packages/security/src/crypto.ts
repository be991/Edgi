import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const DEFAULT_SALT = 'edgi-private-opportunity-platform-secret-salt-2026';

function getDerivedKey(customKey?: string): Buffer {
  const secret = customKey || process.env.CREDENTIALS_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || DEFAULT_SALT;
  return crypto.createHash('sha256').update(secret).digest();
}

export interface EncryptedPayload {
  encryptedValue: string;
  iv: string;
}

/**
 * Encrypts a sensitive credential (token, API key, password) at rest using AES-256-GCM.
 */
export function encryptCredential(plaintext: string, customKey?: string): EncryptedPayload {
  const key = getDerivedKey(customKey);
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  // We append the 16-byte auth tag to the end of the encrypted hex for storage convenience
  return {
    encryptedValue: `${encrypted}:${tag}`,
    iv: iv.toString('hex'),
  };
}

/**
 * Decrypts a sensitive credential using AES-256-GCM.
 */
export function decryptCredential(payload: EncryptedPayload, customKey?: string): string {
  const key = getDerivedKey(customKey);
  const iv = Buffer.from(payload.iv, 'hex');

  const [encrypted, tagHex] = payload.encryptedValue.split(':');
  if (!encrypted || !tagHex) {
    throw new Error('Invalid encrypted credential format: missing authentication tag.');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
