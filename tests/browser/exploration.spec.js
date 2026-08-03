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

test("offers a retry when required public data cannot be loaded", async ({ page }) => {
  await page.route("**/data/navigation.json", (route) => route.abort());
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "The landscape could not be opened" })).toBeVisible();
  await expect(page.getByText("Its public data is currently unavailable.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeFocused();
});
