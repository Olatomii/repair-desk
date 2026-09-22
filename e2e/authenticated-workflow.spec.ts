import { test, expect, type APIRequestContext, type BrowserContext } from "@playwright/test";
import { prisma } from "../src/lib/prisma";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";

test("authenticated repair lifecycle, isolation, stale requests and evidence", async ({ browser, page, baseURL }) => {
  test.setTimeout(120_000);
  if (!baseURL || !['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname) ||
      !['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname)) {
    throw new Error("Workflow fixtures may only run against a local app and database");
  }
  const suffix = randomUUID();
  const password = 'AuditPassword-2026!';
  const signUp = async (api: APIRequestContext, data: object) => {
    let response = await api.post('/api/auth/sign-up/email', { headers: { origin: baseURL }, data });
    if (response.status() === 429) {
      const seconds = Number(response.headers()['x-retry-after']);
      expect(seconds).toBeGreaterThan(0);
      expect(seconds).toBeLessThanOrEqual(10);
      await new Promise(resolve => setTimeout(resolve, seconds * 1000 + 100));
      response = await api.post('/api/auth/sign-up/email', { headers: { origin: baseURL }, data });
    }
    return response;
  };
  const email = `client-${suffix}@example.invalid`;
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Audit Client');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/client$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your repairs' })).toBeVisible();
  const client = await prisma.user.findUniqueOrThrow({ where: { email } });
  const contexts: BrowserContext[] = [];
  const account = async (role: 'ARTISAN' | 'OPERATOR' | 'CLIENT') => {
    const context = await browser.newContext({ baseURL });
    contexts.push(context);
    if (role === 'CLIENT') {
      const response = await context.request.post('/api/auth/sign-up/email', { headers: { origin: baseURL }, data: { email: `other-${randomUUID()}@example.invalid`, name: 'Other client', password } });
      expect(response.ok(), await response.text()).toBeTruthy();
      return { context, user: (await response.json()).user as { id: string; email: string } };
    }
    const id = randomUUID();
    const user = await prisma.user.create({ data: { id, email: `${role.toLowerCase()}-${id}@example.invalid`, name: `Audit ${role}`, role,
      accounts: { create: { id: randomUUID(), accountId: id, providerId: 'credential', password: await hashPassword(password) } },
    } });
    const response = await context.request.post('/api/auth/sign-in/email', { headers: { origin: baseURL }, data: { email: user.email, password } });
    expect(response.ok(), await response.text()).toBeTruthy();
    return { context, user };
  };
  const artisan = await account('ARTISAN');
  const operator = await account('OPERATOR');
  const stranger = await account('CLIENT');
  const city = await prisma.city.findFirstOrThrow({ where: { isActive: true } });
  const service = await prisma.serviceCategory.findUniqueOrThrow({ where: { slug: 'plumbing' } });
  const profile = await prisma.artisanProfile.create({ data: { userId: artisan.user.id, status: 'ACTIVE', cities: { create: { cityId: city.id } }, services: { create: { serviceId: service.id } } } });
  const operatorPage = await operator.context.newPage();
  await operatorPage.goto('/operator');
  await expect(operatorPage.getByRole('heading', { name: 'Repair Desk operations' })).toBeVisible();
  await page.goto('/book');
  await page.getByText('Plumbing', { exact: true }).click();
  await page.getByLabel('Describe the problem').fill('Audit fixture: kitchen sink leaking beneath cabinet.');
  await page.getByLabel('Service address').fill('Audit test address');
  await page.getByRole('button', { name: 'Create repair request' }).click();
  await expect(page).toHaveURL(/\/client$/);
  let booking = await prisma.booking.findFirstOrThrow({ where: { clientId: client.id } });
  const actionURL = `/api/bookings/${booking.id}/action`;
  const action = async (api: APIRequestContext, name: string, extra: object = {}, snapshot = booking.updatedAt.toISOString()) => api.post(actionURL, { data: { action: name, expectedUpdatedAt: snapshot, ...extra } });
  const refresh = async () => { booking = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }); };
  expect((await page.request.post('/api/bookings', { data: '{', headers: { 'content-type': 'application/json' } })).status()).toBe(400);
  expect((await action(page.request, 'ASSIGN_ARTISAN', { artisanId: profile.id })).status()).toBe(403);
  expect((await action(operator.context.request, 'ASSIGN_ARTISAN', { artisanId: 'missing' })).status()).toBe(409);
  await prisma.artisanProfile.update({ where: { id: profile.id }, data: { status: 'SUSPENDED' } });
  expect((await action(operator.context.request, 'ASSIGN_ARTISAN', { artisanId: profile.id })).status()).toBe(409);
  await prisma.artisanProfile.update({ where: { id: profile.id }, data: { status: 'ACTIVE' } });
  await prisma.user.update({ where: { id: artisan.user.id }, data: { role: 'CLIENT' } });
  expect((await action(operator.context.request, 'ASSIGN_ARTISAN', { artisanId: profile.id })).status()).toBe(409);
  await prisma.user.update({ where: { id: artisan.user.id }, data: { role: 'ARTISAN' } });
  await prisma.artisanCity.delete({ where: { artisanId_cityId: { artisanId: profile.id, cityId: city.id } } });
  expect((await action(operator.context.request, 'ASSIGN_ARTISAN', { artisanId: profile.id })).status()).toBe(409);
  await prisma.artisanCity.create({ data: { artisanId: profile.id, cityId: city.id } });
  await prisma.artisanService.delete({ where: { artisanId_serviceId: { artisanId: profile.id, serviceId: service.id } } });
  expect((await action(operator.context.request, 'ASSIGN_ARTISAN', { artisanId: profile.id })).status()).toBe(409);
  await prisma.artisanService.create({ data: { artisanId: profile.id, serviceId: service.id } });
  const assignmentSnapshot = booking.updatedAt.toISOString();
  const assignments = await Promise.all([1, 2].map(() => action(operator.context.request, 'ASSIGN_ARTISAN', { artisanId: profile.id }, assignmentSnapshot)));
  expect(assignments.map(r => r.status()).sort()).toEqual([200, 409]);
  await refresh();
  const artisanPage = await artisan.context.newPage();
  await artisanPage.goto('/artisan');
  await expect(artisanPage.getByText('Service address: Audit test address', { exact: true })).toBeVisible();
  await artisanPage.setViewportSize({ width: 390, height: 844 });
  expect(await artisanPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await action(artisan.context.request, 'START_WORK')).status()).toBe(409);
  expect((await action(artisan.context.request, 'SUBMIT_QUOTE', { amount: 0.001 })).status()).toBe(400);
  expect((await action(artisan.context.request, 'SUBMIT_QUOTE', { amount: 12500, note: 'Parts and labour' })).status()).toBe(200);
  await refresh();
  const oldQuote = booking.updatedAt.toISOString();
  expect((await action(stranger.context.request, 'APPROVE_QUOTE')).status()).toBe(403);
  expect((await action(page.request, 'REJECT_QUOTE')).status()).toBe(200);
  await refresh();
  expect(booking.quotedAmount).toBeNull();
  expect((await action(artisan.context.request, 'SUBMIT_QUOTE', { amount: 15000 })).status()).toBe(200);
  await refresh();
  expect((await action(page.request, 'APPROVE_QUOTE', {}, oldQuote)).status()).toBe(409);
  await page.reload();
  await page.getByRole('button', { name: 'Approve quote', exact: true }).click();
  await expect(page.getByText('QUOTE APPROVED', { exact: true }).first()).toBeVisible();
  await refresh();
  expect((await action(artisan.context.request, 'START_WORK')).status()).toBe(200);
  await refresh();
  const evidenceURL = `/api/bookings/${booking.id}/evidence`;
  await prisma.artisanProfile.update({ where: { id: profile.id }, data: { status: 'SUSPENDED' } });
  expect((await artisan.context.request.post(evidenceURL, { multipart: { kind: 'DOCUMENT' } })).status()).toBe(403);
  await prisma.artisanProfile.update({ where: { id: profile.id }, data: { status: 'ACTIVE' } });
  expect((await stranger.context.request.post(evidenceURL, { multipart: { kind: 'DOCUMENT', file: { name: 'x.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') } } })).status()).toBe(403);
  expect((await page.request.post(evidenceURL, { headers: { origin: 'https://attacker.invalid' }, multipart: { kind: 'DOCUMENT' } })).status()).toBe(403);
  expect((await page.request.post(evidenceURL, { multipart: { kind: 'DOCUMENT', file: { name: 'x.pdf', mimeType: 'application/pdf', buffer: Buffer.from('<html>bad</html>') } } })).status()).toBe(400);
  await page.reload();
  await page.getByLabel('File', { exact: true }).setInputFiles({ name: 'audit.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4l8AAAAASUVORK5CYII=', 'base64') });
  await page.getByRole('button', { name: 'Add evidence' }).click();
  await page.getByText('Evidence (1)', { exact: true }).click();
  await expect(page.getByRole('link', { name: /audit.png/ })).toBeVisible();
  const evidence = await prisma.bookingEvidence.findFirstOrThrow({ where: { bookingId: booking.id } });
  expect((await stranger.context.request.get(`/api/evidence/${evidence.id}`)).status()).toBe(403);
  const download = await page.request.get(`/api/evidence/${evidence.id}`);
  expect(download.status()).toBe(200);
  expect(download.headers()['x-content-type-options']).toBe('nosniff');
  expect(download.headers()['cache-control']).toContain('no-store');
  await refresh();
  expect((await action(artisan.context.request, 'MARK_WORK_COMPLETE')).status()).toBe(200);
  await refresh();
  const handovers = await Promise.all([1, 2].map(() => action(page.request, 'CONFIRM_HANDOVER')));
  expect(handovers.map(r => r.status()).sort()).toEqual([200, 409]);
  expect((await prisma.artisanProfile.findUniqueOrThrow({ where: { id: profile.id } })).jobsDone).toBe(1);
  const strangerNotice = await prisma.notification.create({ data: { userId: stranger.user.id, title: 'Private', body: 'Private' } });
  expect((await page.request.post('/api/notifications/read')).status()).toBe(200);
  expect(await prisma.notification.count({ where: { userId: client.id, readAt: null } })).toBe(0);
  expect((await prisma.notification.findUniqueOrThrow({ where: { id: strangerNotice.id } })).readAt).toBeNull();
  await page.goto('/operator');
  await expect(page).toHaveURL(/\/client$/);
  await page.goto('/notifications');
  await page.route('**/api/notifications/read', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.getByRole('button', { name: 'Mark all read' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Unable to update notifications' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark all read' })).toBeEnabled();
  await page.unroute('**/api/notifications/read');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/client');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/client$/);
  const duplicateBody = { cityId: city.id, serviceCategoryId: service.id, address: 'Retry test', problemDescription: 'Concurrent retry regression fixture' };
  const retryKey = randomUUID();
  const retries = await Promise.all([1, 2].map(() => page.request.post('/api/bookings', { headers: { 'idempotency-key': retryKey }, data: duplicateBody })));
  expect(retries.map(r => r.status()).sort()).toEqual([200, 201]);
  expect((await retries[0].json()).id).toBe((await retries[1].json()).id);
  expect(await prisma.booking.count({ where: { clientId: client.id, problemDescription: duplicateBody.problemDescription } })).toBe(1);
  expect((await page.request.post('/api/bookings', { headers: { 'idempotency-key': retryKey }, data: { ...duplicateBody, address: 'Changed input' } })).status()).toBe(409);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const duplicate = await signUp(page.request, { name: 'Duplicate', email, password });
  expect((await duplicate.json()).code).toBe('USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL');
  const weak = await signUp(page.request, { name: 'Weak', email: `weak-${suffix}@example.invalid`, password: 'short' });
  expect((await weak.json()).code).toBe('PASSWORD_TOO_SHORT');
  const escalationEmail = `escalation-${suffix}@example.invalid`;
  const escalation = await signUp(stranger.context.request, { name: 'Escalation', email: escalationEmail, password, role: 'OPERATOR' });
  expect(escalation.ok(), await escalation.text()).toBeTruthy();
  expect((await prisma.user.findUniqueOrThrow({ where: { email: escalationEmail } })).role).toBe('CLIENT');
  await prisma.booking.createMany({ data: Array.from({ length: 21 }, (_, index) => ({
    reference: `PAGING-${suffix}-${index}`, clientId: client.id, cityId: city.id,
    serviceCategoryId: service.id, problemDescription: `Paging regression ${index}`,
  })) });
  await page.goto('/client');
  await expect(page.locator('article')).toHaveCount(20);
  await page.getByRole('link', { name: 'More repairs' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('article')).toHaveCount(3);
  await expect(page.getByText(booking.reference, { exact: true })).toBeVisible();
  for (const context of contexts) await context.close();
});

test.afterAll(async () => { await prisma.$disconnect(); });

test('registration recovers from a failed network request', async ({ page }) => {
  await page.goto('/register');
  await page.route('**/api/auth/sign-up/email', route => route.abort());
  await page.getByLabel('Full name').fill('Network failure test');
  await page.getByLabel('Email', { exact: true }).fill('network-failure@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('AuditPassword-2026!');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('Unable to reach the server. Please try again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeEnabled();
});
