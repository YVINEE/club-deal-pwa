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
  await page.getByRole("heading", { name: dealName, exact: true }).click();
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
  await page.getByRole("button", { name: "Activer le chiffrement" }).click();
  await page.getByLabel("Mot de passe de chiffrement").fill("motdepasse-e2e");
  await page.getByLabel("Confirmer le mot de passe").fill("motdepasse-e2e");
  await page.getByRole("button", { name: "Chiffrer la base" }).click();
  await expect(page.getByText("Chiffrée", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Base locale chiffrée" })).toBeVisible();
  await page.getByLabel("Mot de passe de chiffrement").fill("motdepasse-e2e");
  await page.getByRole("button", { name: "Déverrouiller" }).click();
  await expect(page.getByRole("heading", { name: "Paramètres", exact: true })).toBeVisible();
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

test("filtre les deals et les échéances", async ({ page }) => {
  await openApp(page);
  await openDeals(page);
  await fillDeal(page);

  const dealFilters = page.getByRole("group", { name: "Filtrer les deals" });
  await dealFilters.getByRole("button", { name: /^Actifs/ }).click();
  await expect(page.getByText("Aucun deal dans ce filtre.")).toBeVisible();
  await dealFilters.getByRole("button", { name: /^En prolongation/ }).click();
  await expect(page.getByText("Aucun deal dans ce filtre.")).toBeVisible();

  await openDeadlines(page);
  const deadlineFilters = page.getByRole("tablist", { name: "Filtrer les échéances" });
  await deadlineFilters.getByRole("tab", { name: /^À pointer/ }).click();
  await expect(page.getByText(dealName, { exact: true }).first()).toBeVisible();
  await deadlineFilters.getByRole("tab", { name: /^Encaissées/ }).click();
  await expect(page.getByText("Aucune échéance dans ce filtre.")).toBeVisible();
});
