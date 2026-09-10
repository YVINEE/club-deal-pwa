import { expect, test, type Page } from "@playwright/test";

const dealName = "Deal Playwright";
const oldStartDate = "2024-01-15";

async function openApp(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Vue d’ensemble" })).toBeVisible();
}

async function openDeals(page: Page) {
  await page.getByRole("link", { name: "Liste des deals" }).click();
  await expect(page.getByRole("heading", { name: "Deals", exact: true })).toBeVisible();
}

async function openSettings(page: Page) {
  await page.getByRole("link", { name: "Réglages" }).click();
  await expect(page.getByRole("heading", { name: "Paramètres", exact: true })).toBeVisible();
}

async function openDeadlines(page: Page) {
  await page.getByRole("link", { name: "Toutes les échéances" }).click();
  await expect(page.getByRole("heading", { name: "Échéances", exact: true })).toBeVisible();
}

async function fillDeal(page: Page, name = dealName) {
  await page.getByRole("button", { name: "Ajouter un deal" }).click();
  await expect(page.getByRole("heading", { name: "Nouveau deal" })).toBeVisible();

  const fields = page.locator("form input");
  await fields.nth(0).fill(name);
  await fields.nth(1).fill(oldStartDate);
  await fields.nth(2).fill("10000");
  await fields.nth(3).fill("12");
  await fields.nth(4).fill("12");
  await fields.nth(5).fill("0");
  await page.getByRole("button", { name: "Créer", exact: true }).click();
  await expect(page).toHaveURL(/\/club-deal-pwa\/deals$/);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.getByText("Fin prévue", { exact: true }).first()).toBeVisible();
}

test("crée, annule, modifie et revient à la liste des deals", async ({ page }) => {
  await openApp(page);
  await openDeals(page);

  await page.getByRole("button", { name: "Ajouter un deal" }).click();
  await expect(page.getByRole("heading", { name: "Nouveau deal" })).toBeVisible();
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page).toHaveURL(/\/club-deal-pwa\/deals$/);

  await fillDeal(page);
  await page.getByRole("link", { name: "Tableau de bord" }).click();
  await expect(page.getByText(/Aujourd’hui ·/).first()).toBeVisible();
  await openDeals(page);
  await page.getByRole("heading", { name: dealName, exact: true }).click();
  await expect(page.getByRole("region", { name: "Valeur actuelle du deal" })).toBeVisible();
  await expect(page.getByText("Valeur actuelle", { exact: true })).toBeVisible();
  await expect(page.getByText("Rendement net : 12 % / an · Trimestriel", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Résumé financier du deal" })).toBeVisible();
  await expect(page.getByText("Capital investi", { exact: true })).toBeVisible();
  await expect(page.getByText("Gains acquis", { exact: true })).toBeVisible();
  await expect(page.getByText("Gains futurs", { exact: true })).toBeVisible();
  await expect(page.getByText("Total final prévu", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Modifier" }).click();
  await expect(page.getByRole("heading", { name: "Modifier le deal" })).toBeVisible();
  await page.locator("form input").nth(0).fill("Deal Playwright modifié");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page).toHaveURL(/\/club-deal-pwa\/deals$/);
  await expect(page.getByRole("heading", { name: "Deal Playwright modifié", exact: true })).toBeVisible();
});

test("ouvre un deal puis utilise le bouton retour", async ({ page }) => {
  await openApp(page);
  await openDeals(page);
  await fillDeal(page);
  await page.getByRole("heading", { name: dealName, exact: true }).click();
  await expect(page).toHaveURL(/\/club-deal-pwa\/deal\/[^/]+$/);
  await page.getByRole("button", { name: "Retour" }).click();
  await expect(page).toHaveURL(/\/club-deal-pwa\/deals$/);
  await expect(page.getByRole("heading", { name: "Deals", exact: true })).toBeVisible();
});

test("annule la dernière prolongation après confirmation", async ({ page }) => {
  await openApp(page);
  await openDeals(page);
  await page.getByRole("button", { name: "Ajouter un deal" }).click();

  const fields = page.locator("form input");
  await fields.nth(0).fill("Deal Prolongation");
  await fields.nth(1).fill("2026-01-15");
  await fields.nth(2).fill("10000");
  await fields.nth(3).fill("12");
  await fields.nth(4).fill("12");
  await fields.nth(5).fill("1");
  await fields.nth(6).fill("6");
  await page.getByRole("button", { name: "Créer", exact: true }).click();
  await page.getByRole("heading", { name: "Deal Prolongation", exact: true }).click();
  await page.getByRole("button", { name: "Prolongations" }).click();
  await page.getByRole("button", { name: "Prolonger de 6 mois" }).click();
  await expect(page.getByText("Prolongation n°1", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Annuler la dernière prolongation" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("alertdialog").getByRole("button", { name: "Annuler la prolongation" }).click();
  await expect(page.getByText("Aucune prolongation pour ce deal", { exact: true })).toBeVisible();
});

test("pointe puis dépointe une échéance", async ({ page }) => {
  await openApp(page);
  await openSettings(page);
  const suivi = page.getByRole("switch", { name: "Activer le suivi des encaissements" });
  if ((await suivi.getAttribute("aria-checked")) !== "true") await suivi.click();
  await openDeals(page);
  await fillDeal(page);
  await openDeadlines(page);

  await page.getByRole("button", { name: "Pointer", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Dépointer", exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Dépointer", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Pointer", exact: true }).first()).toBeVisible();
});

test("change de thème clair puis sombre", async ({ page }) => {
  await openApp(page);
  await openSettings(page);
  await page.getByRole("radiogroup", { name: "Thème de l’application" }).getByText("Clair", { exact: true }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("radiogroup", { name: "Thème de l’application" }).getByText("Sombre", { exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("active puis désactive les notifications d’échéances", async ({ page }) => {
  await page.addInitScript(() => {
    class MockNotification {
      static permission = "granted";
      static requestPermission = async () => "granted";
      onclick: (() => void) | null = null;
      close() {}
      constructor() {}
    }
    Object.defineProperty(window, "Notification", { configurable: true, value: MockNotification });
  });
  await openApp(page);
  await openSettings(page);

  const notifications = page.getByRole("switch", { name: "Activer les notifications d’échéances" });
  await expect(notifications).toHaveAttribute("aria-checked", "false");
  await notifications.click();
  await expect(notifications).toHaveAttribute("aria-checked", "true");
  await notifications.click();
  await expect(notifications).toHaveAttribute("aria-checked", "false");
});

test("active le chiffrement, recharge et déverrouille", async ({ page }) => {
  await openApp(page);
  await openSettings(page);
  await page.getByRole("button", { name: "Mettre un mot de passe" }).click();
  await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasse-e2e");
  await page.getByLabel("Confirmer le mot de passe").fill("motdepasse-e2e");
  await page.getByRole("button", { name: "Mettre le mot de passe" }).click();
  await expect(page.getByText("Protégée", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Application protégée" })).toBeVisible();
  await page.clock.install();
  await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasse-e2e");
  await page.getByRole("button", { name: "Déverrouiller" }).click();
  await expect(page.getByRole("heading", { name: "Paramètres", exact: true })).toBeVisible();

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(60_001);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("heading", { name: "Application protégée" })).toBeVisible();
});

test("exporte puis importe un JSON", async ({ page, browser }) => {
  await openApp(page);
  await openDeals(page);
  await fillDeal(page);
  await openSettings(page);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const path = await download.path();
  expect(path).not.toBeNull();

  const importedContext = await browser.newContext();
  const importedPage = await importedContext.newPage();
  try {
    await importedPage.goto("/club-deal-pwa/parametres");
    importedPage.once("dialog", (dialog) => void dialog.accept());
    await importedPage.locator('input[type="file"]').setInputFiles(path!);
    await importedPage.waitForLoadState("load");
    await importedPage.getByRole("link", { name: "Liste des deals" }).click();
    await expect(importedPage.getByRole("heading", { name: dealName, exact: true })).toBeVisible();
  } finally {
    await importedContext.close();
  }
});

test("trie les deals par échéance, montant et date de fin", async ({ page }) => {
  await openApp(page);
  await openDeals(page);

  async function createDeal(name: string, startDate: string, amount: string) {
    await page.getByRole("button", { name: "Ajouter un deal" }).click();
    const fields = page.locator("form input");
    await fields.nth(0).fill(name);
    await fields.nth(1).fill(startDate);
    await fields.nth(2).fill(amount);
    await fields.nth(3).fill("12");
    await fields.nth(4).fill("12");
    await fields.nth(5).fill("0");
    await page.getByRole("button", { name: "Créer", exact: true }).click();
  }

  await createDeal("Deal A", "2027-01-15", "5000");
  await createDeal("Deal B", "2027-02-15", "15000");

  const cards = page.locator("h3");
  await expect(page.getByLabel("Trier les deals")).toHaveValue("prochaineEcheance");
  await expect(cards).toHaveText(["Deal A", "Deal B"]);

  await page.getByLabel("Trier les deals").selectOption("montant");
  await expect(cards).toHaveText(["Deal B", "Deal A"]);

  await page.getByLabel("Trier les deals").selectOption("dateFin");
  await expect(cards).toHaveText(["Deal A", "Deal B"]);
  await page.reload();
  await expect(page.getByLabel("Trier les deals")).toHaveValue("dateFin");
});

test("active l’évolution de la CSG 2026 pour un deal éligible", async ({ page }) => {
  await openApp(page);
  await openDeals(page);
  await page.getByRole("button", { name: "Ajouter un deal" }).click();

  const fields = page.locator("form input");
  await fields.nth(0).fill("Deal CSG 2026");
  await fields.nth(1).fill("2025-01-15");
  await fields.nth(2).fill("10000");
  await fields.nth(3).fill("12");
  await fields.nth(4).fill("24");
  await fields.nth(5).fill("0");

  const evolution = page.getByRole("switch", { name: "Appliquer l’évolution de la CSG de 2026" });
  await expect(evolution).toBeVisible();
  await expect(evolution).toHaveAttribute("aria-checked", "false");
  await evolution.click();
  await expect(evolution).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Créer", exact: true }).click();
  await page.getByRole("heading", { name: "Deal CSG 2026", exact: true }).click();
  await expect(page.getByText("Coupons ajustés depuis le 1er janvier 2026", { exact: true })).toBeVisible();
  await expect(page.getByText("295,00 €", { exact: true }).first()).toBeVisible();
});

test("filtre les deals et les échéances", async ({ page }) => {
  await openApp(page);
  await openDeals(page);
  await fillDeal(page);

  const dealFilters = page.getByRole("group", { name: "Filtrer les deals" });
  await dealFilters.getByRole("button", { name: /^Actifs/ }).click();
  await expect(page.getByText("Aucun deal dans ce filtre.")).toBeVisible();
  await dealFilters.getByRole("button", { name: /^Prolongés/ }).click();
  await expect(page.getByText("Aucun deal dans ce filtre.")).toBeVisible();

  await openDeadlines(page);
  const deadlineFilters = page.getByRole("tablist", { name: "Filtrer les échéances" });
  await deadlineFilters.getByRole("tab", { name: /^À pointer/ }).click();
  await expect(page.getByText(dealName, { exact: true }).first()).toBeVisible();
  await deadlineFilters.getByRole("tab", { name: /^Encaissées/ }).click();
  await expect(page.getByText("Aucune échéance dans ce filtre.")).toBeVisible();
});
