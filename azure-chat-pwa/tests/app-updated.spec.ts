import { test, expect } from '@playwright/test';

test.describe('Azure Chat PWA Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001');
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
    
    // 验证所有模型选项
    const models = ['O3', 'O4-mini', 'GPT-4.1', 'GPT-4.1-mini', 'GPT-4.1-nano'];
    const options = await modelSelector.locator('option').allTextContents();
    for (const model of models) {
      expect(options.some(opt => opt.includes(model))).toBeTruthy();
    }
  });

  test('should switch between different AI models', async ({ page }) => {
    const modelSelector = page.locator('select');
    
    // 切换到不同的模型
    await modelSelector.selectOption('gpt-4.1');
    await expect(modelSelector).toHaveValue('gpt-4.1');
    
    await modelSelector.selectOption('claude-3.5');
    await expect(modelSelector).toHaveValue('claude-3.5');
  });

  test('should persist session data in localStorage', async ({ page }) => {
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    
    // 输入消息
    const chatInput = page.locator('textarea[placeholder*="Type a message"]');
    await chatInput.fill('Test message for persistence');
    
    // 检查localStorage
    const localStorage = await page.evaluate(() => window.localStorage.getItem('chat-sessions'));
    expect(localStorage).toBeTruthy();
    
    // 刷新页面
    await page.reload();
    
    // 验证会话仍存在
    const sessionItem = page.locator('.shadow-md');
    await expect(sessionItem).toBeVisible();
  });

  test('should handle session deletion', async ({ page }) => {
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    
    // 找到删除按钮
    const deleteButton = page.locator('button[title="Delete session"]').first();
    
    // 删除会话
    await deleteButton.click();
    
    // 等待删除完成
    await page.waitForTimeout(500);
    
    // 验证会话被删除
    const noSessionsText = page.locator('text=No chat sessions yet');
    await expect(noSessionsText).toBeVisible();
  });

  test('should show proper UI elements for chat messages', async ({ page }) => {
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    
    // 发送消息
    const chatInput = page.locator('textarea[placeholder*="Type a message"]');
    await chatInput.fill('Hello, AI!');
    await page.click('button:has-text("Send")');
    
    // 等待用户消息出现
    const userMessage = page.locator('.bg-blue-600.text-white').first();
    await expect(userMessage).toBeVisible();
    await expect(userMessage).toContainText('Hello, AI!');
    
    // 验证消息容器存在
    const messageContainer = page.locator('.flex-1.overflow-y-auto.p-4');
    await expect(messageContainer).toBeVisible();
  });

  test('should handle empty message submission', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Type a message"]');
    const sendButton = page.locator('button:has-text("Send")');
    
    // 尝试发送空消息
    await chatInput.fill('');
    await sendButton.click();
    
    // 验证没有新消息被添加
    const messages = page.locator('.bg-blue-600.text-white');
    await expect(messages).toHaveCount(0);
  });

  test('should auto-scroll to latest message', async ({ page }) => {
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    
    // 发送多条消息以填满屏幕
    const chatInput = page.locator('textarea[placeholder*="Type a message"]');
    for (let i = 1; i <= 5; i++) {
      await chatInput.fill(`Test message ${i}`);
      await page.click('button:has-text("Send")');
      await page.waitForTimeout(100); // 等待消息渲染
    }
    
    // 检查是否滚动到底部
    const messageContainer = page.locator('.flex-1.overflow-y-auto.p-4');
    const isScrolledToBottom = await messageContainer.evaluate((el) => {
      return Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 10;
    });
    
    expect(isScrolledToBottom).toBeTruthy();
  });
});