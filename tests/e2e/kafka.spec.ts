import { test, expect } from '@playwright/test';

test.describe('Kafka Admin - Topics & Configure', () => {
  test('loads topics and opens Configure dialog', async ({ page }) => {
    // Navigate to Kafka Admin page
    await page.goto('/admin/kafka');

    // Wait for the Kafka Topics card title to be visible
    await expect(page.getByText('Kafka Topics')).toBeVisible();

    // Ensure at least one Configure button is present
    const configureButtons = page.getByRole('button', { name: 'Configure' });
    await expect(configureButtons.first()).toBeVisible();

    // Click the first Configure button
    await configureButtons.first().click();

    // Dialog should open with the Configure Topic title
    const dialogTitle = page.getByText(/Configure Topic:/);
    await expect(dialogTitle).toBeVisible();

    // Close the dialog
    const closeButton = page.getByRole('button', { name: 'Close' });
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // Dialog should be closed (title no longer visible)
    await expect(dialogTitle).toBeHidden();
  });
});