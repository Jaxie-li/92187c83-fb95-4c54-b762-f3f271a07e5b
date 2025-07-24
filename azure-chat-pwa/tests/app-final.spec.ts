import { test, expect } from '@playwright/test';

test.describe('Azure Chat PWA Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001');
    // 清理localStorage
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test('should load the application successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Azure Chat PWA/);
    await expect(page.locator('h1')).toContainText('New Chat');
  });

  test('should display chat interface elements', async ({ page }) => {
    // 检查侧边栏
    await expect(page.locator('.w-64.bg-gray-100')).toBeVisible();
    
    // 检查新建聊天按钮
    const newChatButton = page.locator('button:has-text("New Chat")');
    await expect(newChatButton).toBeVisible();
    
    // 检查聊天输入框
    const chatInput = page.locator('textarea[placeholder*="Type a message"]');
    await expect(chatInput).toBeVisible();
    
    // 检查发送按钮
    const sendButton = page.locator('button:has-text("Send")');
    await expect(sendButton).toBeVisible();
  });

  test('should create a new chat session', async ({ page }) => {
    // 点击新建聊天
    await page.click('button:has-text("New Chat")');
    
    // 验证新会话创建
    await page.waitForTimeout(500);
    const sessionItem = page.locator('.shadow-md');
    await expect(sessionItem).toBeVisible();
  });

  test('should display model selector with all available models', async ({ page }) => {
    // 检查模型选择器
    const modelSelector = page.locator('select');
    await expect(modelSelector).toBeVisible();
    
    // 验证所有模型选项 - 使用实际的模型名称
    const expectedModels = ['O3', 'O4 Mini', 'GPT-4.1', 'GPT-4.1 Mini', 'GPT-4.1 Nano'];
    const options = await modelSelector.locator('option').allTextContents();
    
    for (const model of expectedModels) {
      expect(options.some(opt => opt.includes(model))).toBeTruthy();
    }
  });

  test('should switch between different AI models', async ({ page }) => {
    const modelSelector = page.locator('select');
    
    // 切换到不同的模型 - 使用实际的模型ID
    await modelSelector.selectOption('gpt-4.1');
    await expect(modelSelector).toHaveValue('gpt-4.1');
    
    await modelSelector.selectOption('o3');
    await expect(modelSelector).toHaveValue('o3');
    
    await modelSelector.selectOption('gpt-4.1-mini');
    await expect(modelSelector).toHaveValue('gpt-4.1-mini');
  });

  test('should persist session data in localStorage', async ({ page }) => {
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    await page.waitForTimeout(500);
    
    // 输入消息
    const chatInput = page.locator('textarea[placeholder*="Type a message"]');
    await chatInput.fill('Test message for persistence');
    
    // 发送消息以确保会话被保存
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(1000);
    
    // 检查localStorage - 使用正确的键名
    const sessionsData = await page.evaluate(() => {
      return localStorage.getItem('azure-chat-pwa:sessions');
    });
    expect(sessionsData).toBeTruthy();
    
    const currentSessionId = await page.evaluate(() => {
      return localStorage.getItem('azure-chat-pwa:current-session');
    });
    expect(currentSessionId).toBeTruthy();
    
    // 刷新页面
    await page.reload();
    
    // 验证会话仍存在
    const sessionItem = page.locator('.shadow-md');
    await expect(sessionItem).toBeVisible();
  });

  test('should handle session deletion', async ({ page }) => {
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    await page.waitForTimeout(500);
    
    // 发送一条消息以确保会话被保存
    const chatInput = page.locator('textarea[placeholder*="Type a message"]');
    await chatInput.fill('Test message');
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(500);
    
    // 悬停在会话项上以显示删除按钮
    const sessionItem = page.locator('.shadow-md').first();
    await sessionItem.hover();
    
    // 找到删除按钮
    const deleteButton = page.locator('button[title="Delete session"]').first();
    await expect(deleteButton).toBeVisible();
    
    // 删除会话
    await deleteButton.click();
    
    // 等待删除完成
    await page.waitForTimeout(500);
    
    // 验证会话被删除 - 检查localStorage
    const sessionsData = await page.evaluate(() => {
      const data = localStorage.getItem('azure-chat-pwa:sessions');
      return data ? JSON.parse(data) : [];
    });
    expect(sessionsData.length).toBe(0);
  });

  test('should show proper UI elements for chat messages', async ({ page }) => {
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    await page.waitForTimeout(500);
    
    // 发送消息
    const chatInput = page.locator('textarea[placeholder*="Type a message"]');
    await chatInput.fill('Hello, AI!');
    await page.click('button:has-text("Send")');
    
    // 等待用户消息出现 - 修正选择器，排除按钮
    await page.waitForTimeout(500);
    const userMessage = page.locator('.bg-blue-600.text-white').filter({ hasNotText: 'New Chat' }).first();
    await expect(userMessage).toBeVisible();
    await expect(userMessage).toContainText('Hello, AI!');
    
    // 验证消息容器存在
    const messageContainer = page.locator('.flex-1.overflow-y-auto.p-4');
    await expect(messageContainer).toBeVisible();
  });

  test('should handle empty message submission', async ({ page }) => {
    // 创建新会话先
    await page.click('button:has-text("New Chat")');
    await page.waitForTimeout(500);
    
    const chatInput = page.locator('textarea[placeholder*="Type a message"]');
    const sendButton = page.locator('button:has-text("Send")');
    
    // 尝试发送空消息 - 确保输入框是空的
    await chatInput.clear();
    
    // 验证发送按钮被禁用（空消息不能发送）
    await expect(sendButton).toBeDisabled();
  });

  test('should auto-scroll to latest message', async ({ page }) => {
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    await page.waitForTimeout(500);
    
    // 发送多条消息以填满屏幕
    const chatInput = page.locator('textarea[placeholder*="Type a message"]');
    for (let i = 1; i <= 5; i++) {
      await chatInput.fill(`Test message ${i}`);
      await page.click('button:has-text("Send")');
      await page.waitForTimeout(200); // 等待消息渲染
    }
    
    // 检查是否滚动到底部
    const messageContainer = page.locator('.flex-1.overflow-y-auto.p-4');
    const isScrolledToBottom = await messageContainer.evaluate((el) => {
      return Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 10;
    });
    
    expect(isScrolledToBottom).toBeTruthy();
  });
});