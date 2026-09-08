import { describe, expect, it } from "vitest";
import { creerConfigurationPin, pinValide, verifierPin } from "./pinUtils";

describe("pinUtils", () => {
  it("valide uniquement un PIN de 6 chiffres", () => {
    expect(pinValide("123456")).toBe(true);
    expect(pinValide("12345")).toBe(false);
    expect(pinValide("12345a")).toBe(false);
  });

  it("vérifie le PIN sans le stocker dans la configuration", async () => {
    const configuration = await creerConfigurationPin("123456");

    expect(configuration).not.toHaveProperty("pin");
    expect(await verifierPin("123456", configuration)).toBe(true);
    expect(await verifierPin("654321", configuration)).toBe(false);
  });

  it("génère un sel différent pour chaque configuration", async () => {
    const premiere = await creerConfigurationPin("123456");
    const seconde = await creerConfigurationPin("123456");

    expect(premiere.sel).not.toBe(seconde.sel);
  });
});
