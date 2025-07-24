import { test, expect } from '@playwright/test';

test.describe('Basic App Functionality', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Check title
    await expect(page).toHaveTitle('Azure Chat PWA');
    
    // Check main heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('New Chat');
  });

  test('should have all UI elements', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Check New Chat button
    const newChatButton = page.locator('button:has-text("New Chat")');
    await expect(newChatButton).toBeVisible();
    
    // Check input area
    const messageInput = page.locator('textarea[placeholder*="Type a message"]');
    await expect(messageInput).toBeVisible();
    
    // Check send button
    const sendButton = page.locator('button:has-text("Send")');
    await expect(sendButton).toBeVisible();
    
    // Check attach button
    const attachButton = page.locator('button[title="Attach images"]');
    await expect(attachButton).toBeVisible();
    
    // Check model selector
    const modelSelector = page.locator('select');
    await expect(modelSelector).toBeVisible();
  });

  test('should create new session', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Click new chat
    await page.click('button:has-text("New Chat")');
    
    // Check if session appears in list
    const sessionItem = page.locator('.shadow-md');
    await expect(sessionItem).toBeVisible();
  });
});