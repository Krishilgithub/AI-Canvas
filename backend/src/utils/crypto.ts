import * as crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
// Ensure we have a 32 byte key. If not provided, we fallback to a derived key from something stable (NOT recommended for production, but prevents crashes)
const getSecretKey = () => {
  const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key-please-change';
  return crypto.scryptSync(secret, 'ai-canvas-salt', 32);
};

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted text format');
    
    const [ivHex, authTagHex, encryptedData] = parts;
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Failed to decrypt data');
  }
};
