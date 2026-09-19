import { expect, test } from "@playwright/test";

test("landing page presents the Repair Desk product", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Repair Desk/i);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Know who");
  await expect(page.getByRole("link", { name: /create account/i })).toBeVisible();
});

test("authentication entry points are usable", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeVisible();
});

test("health endpoint responds successfully", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({ ok: true, service: "repair-desk" });
});
