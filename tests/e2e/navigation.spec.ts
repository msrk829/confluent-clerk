import { test, expect } from '@playwright/test';

test.describe('Navigation and Routing', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/user-dashboard');
  });

  test('should navigate to all user pages', async ({ page }) => {
    // Test navigation to Request Topic
    await page.click('a:has-text("Request Topic")');
    await expect(page).toHaveURL('/request-topic');
    await expect(page.locator('h1')).toContainText('Request Topic');

    // Test navigation to Request ACL
    await page.click('a:has-text("Request ACL")');
    await expect(page).toHaveURL('/request-acl');
    await expect(page.locator('h1')).toContainText('Request ACL');

    // Test navigation to Request History
    await page.click('a:has-text("Request History")');
    await expect(page).toHaveURL('/request-history');
    await expect(page.locator('h1')).toContainText('Request History');

    // Test navigation back to Dashboard
    await page.click('a:has-text("Dashboard")');
    await expect(page).toHaveURL('/user-dashboard');
    await expect(page.locator('h1')).toContainText('User Dashboard');
  });

  test('should handle direct URL access', async ({ page }) => {
    // Test direct access to request-topic
    await page.goto('/request-topic');
    await expect(page).toHaveURL('/request-topic');
    await expect(page.locator('h1')).toContainText('Request Topic');

    // Test direct access to request-acl
    await page.goto('/request-acl');
    await expect(page).toHaveURL('/request-acl');
    await expect(page.locator('h1')).toContainText('Request ACL');

    // Test direct access to request-history
    await page.goto('/request-history');
    await expect(page).toHaveURL('/request-history');
    await expect(page.locator('h1')).toContainText('Request History');
  });

  test('should handle 404 for invalid routes', async ({ page }) => {
    await page.goto('/invalid-route');
    await expect(page.locator('h1')).toContainText('404');
  });

  test('should maintain authentication state across navigation', async ({ page }) => {
    // Navigate to different pages and ensure user stays logged in
    const pages = ['/request-topic', '/request-acl', '/request-history', '/user-dashboard'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      // Should not redirect to login page
      await expect(page).not.toHaveURL('/');
      // Should have logout button visible (indicating authenticated state)
      await expect(page.locator('button:has-text("Logout")')).toBeVisible();
    }
  });
});

test.describe('Admin Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('/');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin-dashboard');
  });

  test('should have access to admin dashboard', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
    // Admin should have additional navigation options or features
  });

  test('should maintain admin privileges across navigation', async ({ page }) => {
    // Test that admin can access all pages
    const pages = ['/request-topic', '/request-acl', '/request-history'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await expect(page).not.toHaveURL('/');
      await expect(page.locator('button:has-text("Logout")')).toBeVisible();
    }
    
    // Admin should be able to return to admin dashboard
    await page.goto('/admin-dashboard');
    await expect(page).toHaveURL('/admin-dashboard');
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
  });
});