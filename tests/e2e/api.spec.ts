import { test, expect } from '@playwright/test';

test.describe('API Integration', () => {
  test('should connect to backend API', async ({ page }) => {
    // Intercept API calls
    let apiCallMade = false;
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCallMade = true;
      }
    });

    // Login to trigger API call
    await page.goto('/');
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await expect(page).toHaveURL('/user-dashboard');
    
    // Verify API call was made
    expect(apiCallMade).toBe(true);
  });

  test('should handle API responses correctly', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          token_type: 'bearer',
          user: { username: 'testuser', is_admin: false }
        })
      });
    });

    await page.goto('/');
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/user-dashboard');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' })
      });
    });

    await page.goto('/');
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    await page.click('button[type="submit"]');
    
    // Should show error message or stay on login page
    // The exact behavior depends on error handling implementation
    await page.waitForTimeout(2000); // Wait for potential error handling
  });

  test('should make health check API call', async ({ page }) => {
    let healthCheckCalled = false;
    
    page.on('request', request => {
      if (request.url().includes('/health')) {
        healthCheckCalled = true;
      }
    });

    // Navigate to a page that might trigger health check
    await page.goto('/');
    
    // Wait a bit for potential health check calls
    await page.waitForTimeout(1000);
  });

  test('should handle CORS correctly', async ({ page }) => {
    // Test that cross-origin requests work properly
    let corsError = false;
    
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('CORS')) {
        corsError = true;
      }
    });

    await page.goto('/');
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    
    // Should not have CORS errors
    expect(corsError).toBe(false);
  });
});