import { describe, expect, it } from "vitest";
import { chiffrerTexte, dechiffrerTexte } from "./crypto";

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
