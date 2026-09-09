const ITERATIONS = 310_000;
const KEY_LENGTH = 256;

export interface Chiffrement {
  algorithm: "AES-GCM";
  kdf: "PBKDF2-SHA-256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bufferSource(value: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(value.byteLength);
  new Uint8Array(buffer).set(value);
  return buffer;
}

export function motDePasseValide(motDePasse: string): boolean {
  return motDePasse.length >= 8;
}

export async function deriveCle(motDePasse: string, chiffrement: Pick<Chiffrement, "salt" | "iterations">): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(motDePasse),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: bufferSource(fromBase64(chiffrement.salt)),
      iterations: chiffrement.iterations,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function chiffrerAvecCle(
  texte: string,
  cle: CryptoKey,
  salt: string,
  iterations = ITERATIONS,
): Promise<Chiffrement> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: bufferSource(iv) },
    cle,
    bufferSource(new TextEncoder().encode(texte)),
  );
  return {
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA-256",
    iterations,
    salt,
    iv: base64(iv),
    ciphertext: base64(new Uint8Array(encrypted)),
  };
}

export async function chiffrerTexte(texte: string, motDePasse: string): Promise<{ chiffrement: Chiffrement; cle: CryptoKey }> {
  const salt = base64(crypto.getRandomValues(new Uint8Array(16)));
  const parametres = { salt, iterations: ITERATIONS };
  const cle = await deriveCle(motDePasse, parametres);
  return { chiffrement: await chiffrerAvecCle(texte, cle, salt), cle };
}

export async function dechiffrerAvecCle(chiffrement: Chiffrement, cle: CryptoKey): Promise<string> {
  if (chiffrement.algorithm !== "AES-GCM" || chiffrement.kdf !== "PBKDF2-SHA-256") {
    throw new Error("Format de chiffrement inconnu");
  }
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bufferSource(fromBase64(chiffrement.iv)) },
    cle,
    bufferSource(fromBase64(chiffrement.ciphertext)),
  );
  return new TextDecoder().decode(decrypted);
}

export async function dechiffrerTexte(
  chiffrement: Chiffrement,
  motDePasse: string,
): Promise<{ texte: string; cle: CryptoKey }> {
  const cle = await deriveCle(motDePasse, chiffrement);
  return { texte: await dechiffrerAvecCle(chiffrement, cle), cle };
}
