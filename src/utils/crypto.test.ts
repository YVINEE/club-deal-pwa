import { describe, expect, it } from "vitest";
import { chiffrerTexte, dechiffrerTexte, motDePasseValide } from "./crypto";

describe("motDePasseValide", () => {
  it("accepte un mot de passe d'au moins 8 caractères", () => {
    expect(motDePasseValide("12345678")).toBe(true);
    expect(motDePasseValide("mot-de-passe")).toBe(true);
  });

  it("refuse un mot de passe trop court", () => {
    expect(motDePasseValide("1234567")).toBe(false);
    expect(motDePasseValide("")).toBe(false);
  });
});

describe("chiffrement local", () => {
  it("chiffre et déchiffre un payload", async () => {
    const chiffrement = await chiffrerTexte('{"deals":[]}', "mot-de-passe-de-test");

    await expect(dechiffrerTexte(chiffrement.chiffrement, "mot-de-passe-de-test")).resolves.toMatchObject({
      texte: '{"deals":[]}',
    });
    expect(chiffrement.chiffrement.ciphertext).not.toContain("deals");
  });

  it("rejette un mauvais mot de passe", async () => {
    const chiffrement = await chiffrerTexte("secret", "mot-de-passe-de-test");

    await expect(dechiffrerTexte(chiffrement.chiffrement, "mauvais-mot-de-passe")).rejects.toThrow();
  });
});
