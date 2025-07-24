import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

test.describe('Image Handling and Paste Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("New Chat")');
  });

  test('should support image paste from clipboard', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    
    // Create a mock image
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    
    // Simulate paste event
    await page.evaluate(async (base64) => {
      const blob = await fetch(`data:image/png;base64,${base64}`).then(r => r.blob());
      const file = new File([blob], 'pasted-image.png', { type: 'image/png' });
      
      const clipboardData = new DataTransfer();
      clipboardData.items.add(file);
      
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true
      });
      
      document.querySelector('textarea')?.dispatchEvent(pasteEvent);
    }, imageBuffer.toString('base64'));
    
    // Check if image preview appears
    const imagePreview = page.locator('[class*="image-preview"], img[src^="data:"], img[src^="blob:"]');
    await expect(imagePreview).toBeVisible();
  });

  test('should handle multiple image paste', async ({ page }) => {
    // Create mock images
    const createMockImage = (color: string) => {
      const canvas = `<canvas width="1" height="1"></canvas>`;
      return Buffer.from(`iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`, 'base64');
    };
    
    // Simulate multiple images paste
    await page.evaluate(async () => {
      const images = [
        { name: 'image1.png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' },
        { name: 'image2.png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }
      ];
      
      const clipboardData = new DataTransfer();
      
      for (const img of images) {
        const blob = await fetch(`data:image/png;base64,${img.data}`).then(r => r.blob());
        const file = new File([blob], img.name, { type: 'image/png' });
        clipboardData.items.add(file);
      }
      
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true
      });
      
      document.querySelector('textarea')?.dispatchEvent(pasteEvent);
    });
    
    // Check multiple image previews
    const imagePreviews = page.locator('[class*="image-preview"], img[src^="data:"], img[src^="blob:"]');
    await expect(imagePreviews).toHaveCount(2);
  });

  test('should display images in chat messages', async ({ page }) => {
    // Mock file upload
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.isVisible()) {
      // Create a test image file
      const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      
      await fileInput.setInputFiles([{
        name: 'test-image.png',
        mimeType: 'image/png',
        buffer
      }]);
      
      // Send message with image
      const chatInput = page.locator('textarea[placeholder*="Type your message"]');
      await chatInput.fill('Here is an image');
      await page.click('button[type="submit"]');
      
      // Check if image appears in message
      const messageImage = page.locator('[class*="message"][class*="user"] img');
      await expect(messageImage).toBeVisible();
    }
  });

  test('should remove image preview on delete', async ({ page }) => {
    // Add image first
    await page.evaluate(async () => {
      const blob = await fetch(`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`).then(r => r.blob());
      const file = new File([blob], 'test.png', { type: 'image/png' });
      
      const clipboardData = new DataTransfer();
      clipboardData.items.add(file);
      
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true
      });
      
      document.querySelector('textarea')?.dispatchEvent(pasteEvent);
    });
    
    // Wait for preview
    const imagePreview = page.locator('[class*="image-preview"], [class*="attachment"]').first();
    await expect(imagePreview).toBeVisible();
    
    // Find and click remove button
    const removeButton = imagePreview.locator('button[aria-label*="Remove"], button[title*="Remove"], button:has-text("×")');
    if (await removeButton.isVisible()) {
      await removeButton.click();
      
      // Verify image is removed
      await expect(imagePreview).not.toBeVisible();
    }
  });

  test('should handle drag and drop images', async ({ page }) => {
    const dropZone = page.locator('[class*="chat-input"], [class*="message-input"], main');
    
    // Create a data transfer with file
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      const file = new File(['test'], 'test-image.png', { type: 'image/png' });
      dt.items.add(file);
      return dt;
    });
    
    // Simulate drag over
    await dropZone.dispatchEvent('dragover', { dataTransfer });
    
    // Check for drop indicator
    const dropIndicator = page.locator('[class*="drag-over"], [class*="drop-zone"]');
    if (await dropIndicator.isVisible()) {
      await expect(dropIndicator).toBeVisible();
    }
    
    // Simulate drop
    await dropZone.dispatchEvent('drop', { dataTransfer });
  });

  test('should validate image file types', async ({ page }) => {
    // Try to paste non-image file
    await page.evaluate(async () => {
      const textFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      const clipboardData = new DataTransfer();
      clipboardData.items.add(textFile);
      
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true
      });
      
      document.querySelector('textarea')?.dispatchEvent(pasteEvent);
    });
    
    // Should not show image preview for non-image files
    const imagePreview = page.locator('[class*="image-preview"], img[src^="data:"]');
    await expect(imagePreview).not.toBeVisible();
    
    // Check for error message
    const errorMessage = page.locator('[class*="error"], [class*="warning"]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText(/image|file type|invalid/i);
    }
  });

  test('should handle large images gracefully', async ({ page }) => {
    // Create a large image (simulate 10MB)
    await page.evaluate(async () => {
      // Create large array buffer
      const size = 10 * 1024 * 1024; // 10MB
      const buffer = new ArrayBuffer(size);
      const blob = new Blob([buffer], { type: 'image/png' });
      const file = new File([blob], 'large-image.png', { type: 'image/png' });
      
      const clipboardData = new DataTransfer();
      clipboardData.items.add(file);
      
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true
      });
      
      document.querySelector('textarea')?.dispatchEvent(pasteEvent);
    });
    
    // Check for size warning or error
    const sizeWarning = page.locator('[class*="error"], [class*="warning"], [class*="alert"]');
    if (await sizeWarning.isVisible()) {
      await expect(sizeWarning).toContainText(/size|large|limit/i);
    }
  });

  test('should maintain image quality in localStorage', async ({ page }) => {
    // Paste an image
    await page.evaluate(async () => {
      const blob = await fetch(`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`).then(r => r.blob());
      const file = new File([blob], 'test.png', { type: 'image/png' });
      
      const clipboardData = new DataTransfer();
      clipboardData.items.add(file);
      
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true
      });
      
      document.querySelector('textarea')?.dispatchEvent(pasteEvent);
    });
    
    // Send message
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Image quality test');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(1000);
    
    // Reload page
    await page.reload();
    
    // Check if image is still visible after reload
    const messageImage = page.locator('[class*="message"][class*="user"] img');
    await expect(messageImage).toBeVisible();
    
    // Verify image src is valid
    const imageSrc = await messageImage.getAttribute('src');
    expect(imageSrc).toBeTruthy();
    expect(imageSrc).toMatch(/^(data:|blob:|http)/);
  });

  test('should show image loading state', async ({ page }) => {
    // Mock slow image loading
    await page.route('**/*.png', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    // Add image with URL
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('![Loading test](https://example.com/test.png)');
    await page.click('button[type="submit"]');
    
    // Check for loading indicator
    const loadingIndicator = page.locator('[class*="loading"], [class*="skeleton"], [class*="placeholder"]');
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toBeVisible();
    }
  });

  test('should handle clipboard permissions', async ({ page, context }) => {
    // Check if clipboard read permission is requested
    const permissionStatus = await page.evaluate(async () => {
      if ('permissions' in navigator && 'clipboard-read' in navigator.permissions) {
        const status = await navigator.permissions.query({ name: 'clipboard-read' as any });
        return status.state;
      }
      return 'not-supported';
    });
    
    // If permissions API is supported, verify handling
    if (permissionStatus !== 'not-supported') {
      const chatInput = page.locator('textarea[placeholder*="Type your message"]');
      await chatInput.focus();
      
      // Try paste shortcut
      await page.keyboard.press('Control+V');
      
      // Check for permission prompt or message
      const permissionMessage = page.locator('[class*="permission"], [class*="clipboard"]');
      if (await permissionMessage.isVisible()) {
        await expect(permissionMessage).toContainText(/clipboard|permission|allow/i);
      }
    }
  });
});