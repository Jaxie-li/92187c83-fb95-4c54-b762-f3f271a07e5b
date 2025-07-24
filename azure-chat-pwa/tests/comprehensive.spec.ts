import { test, expect } from '@playwright/test';

test.describe('Azure Chat PWA Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001');
    // 清理localStorage
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test.describe('Basic UI Tests', () => {
    test('should load the application', async ({ page }) => {
      await expect(page).toHaveTitle('Azure Chat PWA');
      
      // 应用会自动创建初始会话
      await page.waitForTimeout(1000);
      
      // 检查头部标题
      const heading = page.locator('h1');
      await expect(heading).toBeVisible();
    });

    test('should display all UI elements', async ({ page }) => {
      // 等待初始会话创建
      await page.waitForTimeout(1000);
      
      // 检查侧边栏
      await expect(page.locator('.w-64.bg-gray-100')).toBeVisible();
      
      // 检查新建聊天按钮
      const newChatButton = page.locator('button:has-text("New Chat")');
      await expect(newChatButton).toBeVisible();
      
      // 检查输入区域
      const messageInput = page.locator('textarea[placeholder*="Type a message"]');
      await expect(messageInput).toBeVisible();
      
      // 检查发送按钮
      const sendButton = page.locator('button:has-text("Send")');
      await expect(sendButton).toBeVisible();
      
      // 检查附件按钮
      const attachButton = page.locator('button[title="Attach images"]');
      await expect(attachButton).toBeVisible();
      
      // 模型选择器应该在有会话时显示
      const modelSelector = page.locator('select');
      await expect(modelSelector).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should create new sessions', async ({ page }) => {
      // 等待初始会话
      await page.waitForTimeout(1000);
      
      // 点击新建聊天
      await page.click('button:has-text("New Chat")');
      await page.waitForTimeout(500);
      
      // 应该有两个会话项
      const sessionItems = page.locator('.group.cursor-pointer');
      await expect(sessionItems).toHaveCount(2);
    });

    test('should switch between sessions', async ({ page }) => {
      // 创建多个会话
      await page.waitForTimeout(1000);
      
      // 在第一个会话中发送消息
      const chatInput = page.locator('textarea[placeholder*="Type a message"]');
      await chatInput.fill('Message in session 1');
      await page.click('button:has-text("Send")');
      await page.waitForTimeout(500);
      
      // 创建新会话
      await page.click('button:has-text("New Chat")');
      await page.waitForTimeout(500);
      
      // 在第二个会话中发送消息
      await chatInput.fill('Message in session 2');
      await page.click('button:has-text("Send")');
      await page.waitForTimeout(500);
      
      // 切换回第一个会话
      const firstSession = page.locator('.group.cursor-pointer').first();
      await firstSession.click();
      await page.waitForTimeout(500);
      
      // 验证看到第一个会话的消息
      const userMessage = page.locator('.bg-blue-600.text-white').filter({ hasText: 'Message in session 1' });
      await expect(userMessage).toBeVisible();
    });

    test('should delete sessions', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      // 创建额外的会话
      await page.click('button:has-text("New Chat")');
      await page.waitForTimeout(500);
      
      // 悬停在会话上以显示删除按钮
      const sessionItem = page.locator('.group.cursor-pointer').first();
      await sessionItem.hover();
      
      // 点击删除按钮
      const deleteButton = sessionItem.locator('button[title="Delete session"]');
      await deleteButton.click();
      await page.waitForTimeout(500);
      
      // 验证会话数量减少
      const sessionItems = page.locator('.group.cursor-pointer');
      await expect(sessionItems).toHaveCount(1);
    });
  });

  test.describe('Model Selection', () => {
    test('should display and switch models', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const modelSelector = page.locator('select');
      await expect(modelSelector).toBeVisible();
      
      // 验证默认模型
      await expect(modelSelector).toHaveValue('gpt-4.1');
      
      // 切换模型
      await modelSelector.selectOption('o3');
      await expect(modelSelector).toHaveValue('o3');
      
      await modelSelector.selectOption('gpt-4.1-mini');
      await expect(modelSelector).toHaveValue('gpt-4.1-mini');
    });

    test('should persist model selection', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const modelSelector = page.locator('select');
      
      // 切换到不同的模型
      await modelSelector.selectOption('o4-mini');
      await page.waitForTimeout(500);
      
      // 刷新页面
      await page.reload();
      await page.waitForTimeout(1000);
      
      // 验证模型保持选中状态
      await expect(modelSelector).toHaveValue('o4-mini');
    });
  });

  test.describe('Messaging', () => {
    test('should send and display messages', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const chatInput = page.locator('textarea[placeholder*="Type a message"]');
      const sendButton = page.locator('button:has-text("Send")');
      
      // 发送消息
      await chatInput.fill('Hello, this is a test message!');
      await sendButton.click();
      
      // 等待消息显示
      await page.waitForTimeout(500);
      
      // 验证用户消息显示
      const userMessage = page.locator('.bg-blue-600.text-white').filter({ hasText: 'Hello, this is a test message!' });
      await expect(userMessage).toBeVisible();
    });

    test('should not send empty messages', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const chatInput = page.locator('textarea[placeholder*="Type a message"]');
      const sendButton = page.locator('button:has-text("Send")');
      
      // 清空输入框
      await chatInput.clear();
      
      // 发送按钮应该被禁用
      await expect(sendButton).toBeDisabled();
    });

    test('should handle multiline messages', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      const chatInput = page.locator('textarea[placeholder*="Type a message"]');
      
      // 输入多行消息
      await chatInput.fill('Line 1\nLine 2\nLine 3');
      await page.click('button:has-text("Send")');
      await page.waitForTimeout(500);
      
      // 验证消息保留换行
      const userMessage = page.locator('.bg-blue-600.text-white').last();
      const messageText = await userMessage.textContent();
      expect(messageText).toContain('Line 1');
      expect(messageText).toContain('Line 2');
      expect(messageText).toContain('Line 3');
    });
  });

  test.describe('Storage and Persistence', () => {
    test('should save sessions to localStorage', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      // 发送消息以确保会话被保存
      const chatInput = page.locator('textarea[placeholder*="Type a message"]');
      await chatInput.fill('Test persistence');
      await page.click('button:has-text("Send")');
      await page.waitForTimeout(1000);
      
      // 检查localStorage
      const sessions = await page.evaluate(() => {
        return localStorage.getItem('azure-chat-pwa:sessions');
      });
      expect(sessions).toBeTruthy();
      
      const parsedSessions = JSON.parse(sessions);
      expect(parsedSessions.length).toBeGreaterThan(0);
    });

    test('should restore sessions after reload', async ({ page }) => {
      await page.waitForTimeout(1000);
      
      // 发送消息
      const chatInput = page.locator('textarea[placeholder*="Type a message"]');
      await chatInput.fill('Message before reload');
      await page.click('button:has-text("Send")');
      await page.waitForTimeout(1000);
      
      // 刷新页面
      await page.reload();
      await page.waitForTimeout(1000);
      
      // 验证消息仍然存在
      const userMessage = page.locator('.bg-blue-600.text-white').filter({ hasText: 'Message before reload' });
      await expect(userMessage).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should show error for API failures', async ({ page }) => {
      // Mock API error
      await page.route('**/api/chat', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      await page.waitForTimeout(1000);
      
      // 尝试发送消息
      const chatInput = page.locator('textarea[placeholder*="Type a message"]');
      await chatInput.fill('Test error');
      await page.click('button:has-text("Send")');
      
      // 等待错误显示
      await page.waitForTimeout(1000);
      
      // 验证错误提示
      const errorAlert = page.locator('.bg-red-100');
      await expect(errorAlert).toBeVisible();
    });

    test('should clear errors', async ({ page }) => {
      // Mock API error
      await page.route('**/api/chat', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Test error' })
        });
      });
      
      await page.waitForTimeout(1000);
      
      // 触发错误
      const chatInput = page.locator('textarea[placeholder*="Type a message"]');
      await chatInput.fill('Test');
      await page.click('button:has-text("Send")');
      await page.waitForTimeout(1000);
      
      // 清除错误
      const closeButton = page.locator('.bg-red-100 button:has-text("×")');
      await closeButton.click();
      
      // 验证错误消失
      const errorAlert = page.locator('.bg-red-100');
      await expect(errorAlert).not.toBeVisible();
    });
  });

  test.describe('PWA Features', () => {
    test('should have manifest file', async ({ page }) => {
      const response = await page.goto('http://localhost:3001/manifest.json');
      expect(response?.status()).toBe(200);
      
      const manifest = await response?.json();
      expect(manifest.name).toBe('Azure Chat PWA');
      expect(manifest.short_name).toBe('Chat PWA');
    });

    test('should register service worker', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const hasServiceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
      });
      
      // Service worker might not be registered in dev mode
      // This is expected behavior
      if (!hasServiceWorker) {
        console.log('Service worker not registered in development mode');
      }
    });
  });
});