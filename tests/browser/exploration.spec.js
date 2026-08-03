import { expect, test } from "@playwright/test";

test("loads an encounter and follows and retraces a path", async ({ page }) => {
  await page.goto("/");

  const title = page.locator("#encounter-title");
  await expect(title).toHaveText("A Door Left Open");
  const reachableMarkers = page.locator(".encounter-marker--reachable");
  await expect(reachableMarkers.first()).toBeVisible();
  expect(await reachableMarkers.count()).toBeGreaterThanOrEqual(3);
  expect(await reachableMarkers.count()).toBeLessThanOrEqual(4);

  const initialTitle = await title.textContent();
  await reachableMarkers.first().click();
  await expect(title).not.toHaveText(initialTitle);
  await expect(page.getByRole("button", { name: "Retrace" })).toBeEnabled();

  await page.getByRole("button", { name: "Retrace" }).click();
  await expect(title).toHaveText(initialTitle);
  await expect(page.getByRole("button", { name: "Retrace" })).toBeDisabled();
});

test("keeps at least one exploration dimension active", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("checkbox", { name: "Time" }).uncheck();
  await page.getByRole("checkbox", { name: "Feeling" }).uncheck();
  await page.getByRole("checkbox", { name: "Knowing" }).click();

  await expect(page.getByRole("checkbox", { name: "Knowing" })).toBeChecked();
  await expect(page.getByRole("status")).toHaveText("At least one way of exploring must remain.");
});

test("opens and closes About with keyboard focus restored", async ({ page }) => {
  await page.goto("/");

  const about = page.getByRole("button", { name: "About", exact: true });
  await about.click();
  const dialog = page.getByRole("dialog", { name: "About" });
  const close = page.getByRole("button", { name: "Close about" });
  await expect(dialog).toBeVisible();
  await expect(about).toHaveAttribute("aria-expanded", "true");
  await expect(close).toBeFocused();

  await page.keyboard.press("Tab");
  const focusRemainsInDialog = await dialog.evaluate(
    (element) => element === document.activeElement || element.contains(document.activeElement),
  );
  expect(focusRemainsInDialog).toBe(true);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(about).toHaveAttribute("aria-expanded", "false");
  await expect(about).toBeFocused();
});

test("keeps the encounter interface usable at a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator("#encounter")).toBeVisible();
  await expect(page.getByRole("button", { name: "About" })).toBeVisible();
  const fitsViewport = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(fitsViewport).toBe(true);
});
