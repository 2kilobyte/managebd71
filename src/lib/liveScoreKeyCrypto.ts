import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function encryptionKey() {
  const secret = process.env.BD71_LIVE_SCORE_KEY_ENCRYPTION_SECRET ?? '';
  if (secret.length < 32) throw new Error('BD71_LIVE_SCORE_KEY_ENCRYPTION_SECRET must be at least 32 characters.');
  return createHash('sha256').update(secret).digest();
}

export function createScorerKey() {
  const value = `BD71LIVE_${randomBytes(32).toString('base64url')}`;
  return { value, keyHash: createHash('sha256').update(value).digest('hex'), encryptedKey: encryptScorerKey(value), lastFour: value.slice(-4) };
}

export function encryptScorerKey(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptScorerKey(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split('.');
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('Stored scorer key is invalid.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
}
