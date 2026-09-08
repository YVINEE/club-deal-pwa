const ITERATIONS_PBKDF2 = 100_000;

export interface ConfigurationPin {
  sel: string;
  empreinte: string;
  iterations: number;
}

function encoderBase64(valeur: Uint8Array): string {
  let texte = "";
  valeur.forEach((octet) => {
    texte += String.fromCharCode(octet);
  });
  return btoa(texte);
}

function decoderBase64(valeur: string): Uint8Array {
  const texte = atob(valeur);
  return Uint8Array.from(texte, (caractere) => caractere.charCodeAt(0));
}

async function calculerEmpreinte(pin: string, sel: Uint8Array, iterations: number): Promise<string> {
  const materiel = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: sel.buffer as ArrayBuffer, iterations, hash: "SHA-256" },
    materiel,
    256
  );
  return encoderBase64(new Uint8Array(bits));
}

export function pinValide(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export async function creerConfigurationPin(pin: string): Promise<ConfigurationPin> {
  if (!pinValide(pin)) throw new Error("Le PIN doit contenir 6 chiffres");

  const sel = crypto.getRandomValues(new Uint8Array(16));
  return {
    sel: encoderBase64(sel),
    empreinte: await calculerEmpreinte(pin, sel, ITERATIONS_PBKDF2),
    iterations: ITERATIONS_PBKDF2,
  };
}

export async function verifierPin(pin: string, configuration: ConfigurationPin): Promise<boolean> {
  if (!pinValide(pin)) return false;

  try {
    const sel = decoderBase64(configuration.sel);
    const empreinte = await calculerEmpreinte(pin, sel, configuration.iterations);
    return empreinte === configuration.empreinte;
  } catch {
    return false;
  }
}
