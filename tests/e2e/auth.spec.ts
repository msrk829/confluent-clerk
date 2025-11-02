import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page by default', async ({ page }) => {
    await expect(page).toHaveTitle(/Kafka Admin Portal/);
    await expect(page.locator('h1')).toContainText('Login');
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login successfully with any credentials', async ({ page }) => {
    // Fill in login form
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to user dashboard
    await expect(page).toHaveURL('/user-dashboard');
    await expect(page.locator('h1')).toContainText('User Dashboard');
  });

  test('should login as admin with admin credentials', async ({ page }) => {
    // Fill in login form with admin credentials
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to admin dashboard
    await expect(page).toHaveURL('/admin-dashboard');
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await expect(page).toHaveURL('/user-dashboard');
    
    // Find and click logout button
    await page.click('button:has-text("Logout")');
    
    // Should redirect back to login
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Login');
  });

  test('should handle navigation between pages when authenticated', async ({ page }) => {
    // Login first
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    await page.click('button[type="submit"]');
    
    // Navigate to different pages
    await page.click('a:has-text("Request Topic")');
    await expect(page).toHaveURL('/request-topic');
    await expect(page.locator('h1')).toContainText('Request Topic');
    
    await page.click('a:has-text("Request ACL")');
    await expect(page).toHaveURL('/request-acl');
    await expect(page.locator('h1')).toContainText('Request ACL');
    
    await page.click('a:has-text("Request History")');
    await expect(page).toHaveURL('/request-history');
    await expect(page.locator('h1')).toContainText('Request History');
  });
});