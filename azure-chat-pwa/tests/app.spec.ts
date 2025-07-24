import { test, expect } from '@playwright/test';

test.describe('Azure Chat PWA Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the application successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Azure Chat PWA/);
    await expect(page.locator('h1')).toContainText('Azure Chat PWA');
  });

  test('should display chat interface elements', async ({ page }) => {
    // 检查侧边栏
    await expect(page.locator('[class*="sidebar"]')).toBeVisible();
    
    // 检查新建聊天按钮
    const newChatButton = page.locator('button:has-text("New Chat")');
    await expect(newChatButton).toBeVisible();
    
    // 检查聊天输入框
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await expect(chatInput).toBeVisible();
    
    // 检查发送按钮
    const sendButton = page.locator('button[type="submit"]');
    await expect(sendButton).toBeVisible();
  });

  test('should create a new chat session', async ({ page }) => {
    // 点击新建聊天
    await page.click('button:has-text("New Chat")');
    
    // 验证新会话创建
    const sessionList = page.locator('[class*="session-list"]');
    await expect(sessionList.locator('[class*="session-item"]')).toHaveCount(1);
  });

  test('should display model selector with all available models', async ({ page }) => {
    // 检查模型选择器
    const modelSelector = page.locator('select[class*="model-selector"], [data-testid="model-selector"]');
    await expect(modelSelector).toBeVisible();
    
    // 验证所有模型选项
    const models = ['O3', 'O4-mini', 'GPT-4.1', 'GPT-4.1-mini', 'GPT-4.1-nano'];
    for (const model of models) {
      await expect(modelSelector.locator(`option:has-text("${model}")`)).toBeVisible();
    }
  });

  test('should switch between different AI models', async ({ page }) => {
    const modelSelector = page.locator('select[class*="model-selector"], [data-testid="model-selector"]');
    
    // 切换到不同的模型
    await modelSelector.selectOption({ label: 'GPT-4.1' });
    await expect(modelSelector).toHaveValue(/gpt-4\.1/i);
    
    await modelSelector.selectOption({ label: 'O3' });
    await expect(modelSelector).toHaveValue(/o3/i);
  });

  test('should persist session data in localStorage', async ({ page }) => {
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    
    // 输入消息
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Test message for persistence');
    
    // 检查localStorage
    const localStorage = await page.evaluate(() => window.localStorage.getItem('chat-sessions'));
    expect(localStorage).toBeTruthy();
    
    // 刷新页面
    await page.reload();
    
    // 验证会话仍存在
    const sessionList = page.locator('[class*="session-list"]');
    await expect(sessionList.locator('[class*="session-item"]')).toBeVisible();
  });

  test('should handle session deletion', async ({ page }) => {
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    
    // 找到删除按钮（通常在会话项旁边）
    const deleteButton = page.locator('[class*="session-item"]').first().locator('button[aria-label*="Delete"], button[title*="Delete"]');
    
    // 删除会话
    await deleteButton.click();
    
    // 确认删除（如果有确认对话框）
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")').last();
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // 验证会话被删除
    const sessionList = page.locator('[class*="session-list"]');
    await expect(sessionList.locator('[class*="session-item"]')).toHaveCount(0);
  });

  test('should show proper UI elements for chat messages', async ({ page }) => {
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    
    // 发送消息
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Hello, AI!');
    await page.click('button[type="submit"]');
    
    // 等待用户消息出现
    const userMessage = page.locator('[class*="message"][class*="user"]').first();
    await expect(userMessage).toBeVisible();
    await expect(userMessage).toContainText('Hello, AI!');
    
    // 验证消息容器存在
    const messageContainer = page.locator('[class*="message-container"], [class*="chat-messages"]');
    await expect(messageContainer).toBeVisible();
  });

  test('should handle empty message submission', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    const sendButton = page.locator('button[type="submit"]');
    
    // 尝试发送空消息
    await chatInput.fill('');
    await sendButton.click();
    
    // 验证没有新消息被添加
    const messages = page.locator('[class*="message"]');
    await expect(messages).toHaveCount(0);
  });

  test('should auto-scroll to latest message', async ({ page }) => {
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    
    // 发送多条消息以填满屏幕
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    for (let i = 1; i <= 5; i++) {
      await chatInput.fill(`Test message ${i}`);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(100); // 等待消息渲染
    }
    
    // 检查是否滚动到底部
    const messageContainer = page.locator('[class*="message-container"], [class*="chat-messages"]');
    const isScrolledToBottom = await messageContainer.evaluate((el) => {
      return Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 10;
    });
    
    expect(isScrolledToBottom).toBeTruthy();
  });
});