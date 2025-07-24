import { test, expect } from '@playwright/test';

test.describe('Edge Cases and Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    // Try to send message
    await page.click('button:has-text("New Chat")');
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Test error handling');
    await page.click('button[type="submit"]');
    
    // Check for error message
    const errorMessage = page.locator('[class*="error"], [class*="alert"], [role="alert"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/error|failed|try again/i);
  });

  test('should handle network timeout', async ({ page }) => {
    // Mock slow network
    await page.route('**/api/chat', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 35000)); // 35 second delay
      await route.abort();
    });
    
    await page.click('button:has-text("New Chat")');
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Test timeout');
    await page.click('button[type="submit"]');
    
    // Check for timeout message
    const timeoutMessage = page.locator('[class*="error"], [class*="timeout"]');
    await expect(timeoutMessage).toBeVisible({ timeout: 40000 });
  });

  test('should handle invalid API response format', async ({ page }) => {
    // Mock invalid response
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'Invalid response format'
      });
    });
    
    await page.click('button:has-text("New Chat")');
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Test invalid response');
    await page.click('button[type="submit"]');
    
    // Should show error
    const errorIndicator = page.locator('[class*="error"], [class*="failed"]');
    await expect(errorIndicator).toBeVisible();
  });

  test('should handle rapid message sending', async ({ page }) => {
    await page.click('button:has-text("New Chat")');
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    const sendButton = page.locator('button[type="submit"]');
    
    // Send multiple messages rapidly
    for (let i = 0; i < 5; i++) {
      await chatInput.fill(`Rapid message ${i}`);
      await sendButton.click();
      // Don't wait between clicks
    }
    
    // Should queue or handle messages properly
    await page.waitForTimeout(2000);
    
    // Check that messages are handled
    const messages = page.locator('[class*="message"][class*="user"]');
    const messageCount = await messages.count();
    expect(messageCount).toBeGreaterThan(0);
    expect(messageCount).toBeLessThanOrEqual(5);
  });

  test('should handle very long messages', async ({ page }) => {
    await page.click('button:has-text("New Chat")');
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    
    // Create a very long message (10,000 characters)
    const longMessage = 'x'.repeat(10000);
    await chatInput.fill(longMessage);
    await page.click('button[type="submit"]');
    
    // Should either truncate, show warning, or handle gracefully
    const userMessage = page.locator('[class*="message"][class*="user"]').last();
    await expect(userMessage).toBeVisible();
    
    // Check if there's a length warning
    const lengthWarning = page.locator('[class*="warning"], [class*="truncated"]');
    if (await lengthWarning.isVisible()) {
      await expect(lengthWarning).toContainText(/character|length|truncated/i);
    }
  });

  test('should handle special characters in messages', async ({ page }) => {
    await page.click('button:has-text("New Chat")');
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    
    const specialChars = '< > & " \' \\ / 🚀 émojis ñ 中文 العربية';
    await chatInput.fill(specialChars);
    await page.click('button[type="submit"]');
    
    // Message should display correctly
    const userMessage = page.locator('[class*="message"][class*="user"]').last();
    await expect(userMessage).toContainText(specialChars);
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Create sessions
    await page.click('button:has-text("New Chat")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("New Chat")');
    
    // Navigate back
    await page.goBack();
    await page.waitForTimeout(500);
    
    // App should still work
    await expect(page.locator('h1')).toContainText('Azure Chat PWA');
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await expect(chatInput).toBeVisible();
    
    // Navigate forward
    await page.goForward();
    await expect(chatInput).toBeVisible();
  });

  test('should handle concurrent session operations', async ({ page }) => {
    // Create multiple sessions quickly
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(page.click('button:has-text("New Chat")'));
    }
    
    await Promise.all(promises);
    await page.waitForTimeout(1000);
    
    // Check sessions were created properly
    const sessions = page.locator('[class*="session-item"]');
    const sessionCount = await sessions.count();
    expect(sessionCount).toBeGreaterThan(0);
    expect(sessionCount).toBeLessThanOrEqual(5);
  });

  test('should recover from localStorage corruption', async ({ page }) => {
    // Corrupt localStorage
    await page.evaluate(() => {
      localStorage.setItem('chat-sessions', '{"invalid": json structure');
    });
    
    // Reload page
    await page.reload();
    
    // App should recover
    await expect(page.locator('h1')).toContainText('Azure Chat PWA');
    await expect(page.locator('button:has-text("New Chat")')).toBeVisible();
    
    // Should be able to create new session
    await page.click('button:has-text("New Chat")');
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await expect(chatInput).toBeVisible();
  });

  test('should handle missing environment variables', async ({ page }) => {
    // Mock API response for missing config
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service unavailable - Missing configuration' })
      });
    });
    
    await page.click('button:has-text("New Chat")');
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Test missing config');
    await page.click('button[type="submit"]');
    
    // Should show configuration error
    const errorMessage = page.locator('[class*="error"], [role="alert"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/configuration|unavailable/i);
  });

  test('should handle session switching during message sending', async ({ page }) => {
    // Create two sessions
    await page.click('button:has-text("New Chat")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("New Chat")');
    
    // Start sending message in second session
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Message in session 2');
    await page.click('button[type="submit"]');
    
    // Immediately switch to first session
    const firstSession = page.locator('[class*="session-item"]').first();
    await firstSession.click();
    
    // Should handle gracefully
    await page.waitForTimeout(1000);
    await expect(page.locator('[class*="error"]')).not.toBeVisible();
  });

  test('should handle quota exceeded errors', async ({ page }) => {
    // Mock quota exceeded response
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rate limit exceeded' })
      });
    });
    
    await page.click('button:has-text("New Chat")');
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Test rate limit');
    await page.click('button[type="submit"]');
    
    // Should show rate limit message
    const rateLimitMessage = page.locator('[class*="error"], [class*="rate-limit"]');
    await expect(rateLimitMessage).toBeVisible();
    await expect(rateLimitMessage).toContainText(/rate limit|quota|exceeded/i);
  });

  test('should handle memory pressure gracefully', async ({ page }) => {
    // Create many sessions with images
    for (let i = 0; i < 10; i++) {
      await page.click('button:has-text("New Chat")');
      
      // Add large base64 image
      await page.evaluate(async () => {
        const size = 1024 * 1024; // 1MB
        const buffer = new Uint8Array(size);
        const blob = new Blob([buffer], { type: 'image/png' });
        const file = new File([blob], `large-${Date.now()}.png`, { type: 'image/png' });
        
        const clipboardData = new DataTransfer();
        clipboardData.items.add(file);
        
        const pasteEvent = new ClipboardEvent('paste', {
          clipboardData,
          bubbles: true,
          cancelable: true
        });
        
        document.querySelector('textarea')?.dispatchEvent(pasteEvent);
      });
      
      await page.waitForTimeout(100);
    }
    
    // App should still be responsive
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Still working?');
    await expect(chatInput).toHaveValue('Still working?');
  });

  test('should handle invalid model selection', async ({ page }) => {
    await page.click('button:has-text("New Chat")');
    
    // Try to set invalid model via JavaScript
    await page.evaluate(() => {
      const selector = document.querySelector('select') as HTMLSelectElement;
      if (selector) {
        selector.value = 'invalid-model';
        selector.dispatchEvent(new Event('change'));
      }
    });
    
    // Send message
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Test invalid model');
    await page.click('button[type="submit"]');
    
    // Should either use default model or show error
    const errorMessage = page.locator('[class*="error"], [class*="model"]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText(/model|invalid/i);
    }
  });
});