const ITERATIONS = 600000;
const HASH_BYTES = 32;

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

function requireWebCrypto() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error('Secure password storage requires Web Crypto in a secure context.');
  }
}

async function derivePasswordHash(password, salt, iterations) {
  requireWebCrypto();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, HASH_BYTES * 8));
}

export async function hashPassword(password) {
  requireWebCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt, ITERATIONS);
  return {
    passwordAlgorithm: 'PBKDF2-SHA-256',
    passwordIterations: ITERATIONS,
    passwordSalt: bytesToBase64(salt),
    passwordHash: bytesToBase64(hash),
  };
}

export async function verifyPassword(password, user) {
  if (!user?.passwordHash || !user?.passwordSalt || user.passwordAlgorithm !== 'PBKDF2-SHA-256') return false;
  const iterations = Number(user.passwordIterations);
  if (!Number.isSafeInteger(iterations) || iterations < 100000 || iterations > 2000000) return false;
  const actual = await derivePasswordHash(password, base64ToBytes(user.passwordSalt), iterations);
  const expected = base64ToBytes(user.passwordHash);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  return difference === 0;
}