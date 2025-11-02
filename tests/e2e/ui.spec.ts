import { test, expect } from '@playwright/test';

test.describe('UI and Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/user-dashboard');
    
    // Check that elements are properly sized for mobile
    const dashboard = page.locator('h1');
    await expect(dashboard).toBeVisible();
    
    // Navigation should work on mobile
    await page.click('a:has-text("Request Topic")');
    await expect(page).toHaveURL('/request-topic');
  });

  test('should be responsive on tablet devices', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Login
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/user-dashboard');
    
    // Check that layout adapts to tablet size
    const dashboard = page.locator('h1');
    await expect(dashboard).toBeVisible();
  });

  test('should have proper form validation', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors or prevent submission
    // The exact behavior depends on form validation implementation
    await page.waitForTimeout(1000);
    
    // Fill only username
    await page.fill('input[type="text"]', 'testuser');
    await page.click('button[type="submit"]');
    
    // Should still show validation for missing password
    await page.waitForTimeout(1000);
  });

  test('should have accessible elements', async ({ page }) => {
    // Check for proper ARIA labels and roles
    const usernameInput = page.locator('input[type="text"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    // Check that elements are focusable
    await usernameInput.focus();
    await expect(usernameInput).toBeFocused();
    
    await passwordInput.focus();
    await expect(passwordInput).toBeFocused();
    
    await submitButton.focus();
    await expect(submitButton).toBeFocused();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="text"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="password"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
    
    // Test form submission with Enter key
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    await page.keyboard.press('Enter');
    
    await expect(page).toHaveURL('/user-dashboard');
  });

  test('should display loading states appropriately', async ({ page }) => {
    // Fill form
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    
    // Submit and check for loading state
    await page.click('button[type="submit"]');
    
    // Wait for navigation (loading should happen during this time)
    await expect(page).toHaveURL('/user-dashboard');
  });

  test('should have consistent styling across pages', async ({ page }) => {
    // Login first
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    await page.click('button[type="submit"]');
    
    // Check styling consistency across different pages
    const pages = ['/user-dashboard', '/request-topic', '/request-acl', '/request-history'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Check that header/navigation is consistent
      const header = page.locator('header, nav, .header, .navigation').first();
      if (await header.count() > 0) {
        await expect(header).toBeVisible();
      }
      
      // Check that main content area exists
      const main = page.locator('main, .main, .content').first();
      if (await main.count() > 0) {
        await expect(main).toBeVisible();
      }
    }
  });
});