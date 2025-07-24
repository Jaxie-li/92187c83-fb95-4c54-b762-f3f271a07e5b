import { test, expect } from '@playwright/test';

test.describe('LocalStorage and Data Management', () => {
  test.beforeEach(async ({ page }) => {
    // 清理localStorage
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should save chat sessions to localStorage', async ({ page }) => {
    await page.goto('/');
    
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    
    // 发送消息
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Test localStorage message');
    await page.click('button[type="submit"]');
    
    // 等待保存
    await page.waitForTimeout(500);
    
    // 检查localStorage
    const storageData = await page.evaluate(() => {
      const data = localStorage.getItem('chat-sessions');
      return data ? JSON.parse(data) : null;
    });
    
    expect(storageData).toBeTruthy();
    expect(storageData.sessions).toBeDefined();
    expect(storageData.sessions.length).toBeGreaterThan(0);
  });

  test('should limit number of sessions to 50', async ({ page }) => {
    await page.goto('/');
    
    // 创建51个会话来测试限制
    for (let i = 0; i < 51; i++) {
      await page.click('button:has-text("New Chat")');
      await page.waitForTimeout(50); // 避免过快点击
    }
    
    // 检查会话数量
    const sessionCount = await page.locator('[class*="session-item"]').count();
    expect(sessionCount).toBeLessThanOrEqual(50);
    
    // 验证localStorage中的会话数
    const storageData = await page.evaluate(() => {
      const data = localStorage.getItem('chat-sessions');
      return data ? JSON.parse(data) : null;
    });
    
    expect(storageData.sessions.length).toBeLessThanOrEqual(50);
  });

  test('should limit messages per session to 100', async ({ page }) => {
    await page.goto('/');
    
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    const sendButton = page.locator('button[type="submit"]');
    
    // 尝试发送101条消息
    for (let i = 0; i < 101; i++) {
      await chatInput.fill(`Message ${i + 1}`);
      await sendButton.click();
      await page.waitForTimeout(50);
    }
    
    // 检查消息数量
    const messageCount = await page.locator('[class*="message"][class*="user"]').count();
    expect(messageCount).toBeLessThanOrEqual(100);
    
    // 验证localStorage中的消息数
    const storageData = await page.evaluate(() => {
      const data = localStorage.getItem('chat-sessions');
      return data ? JSON.parse(data) : null;
    });
    
    const currentSession = storageData.sessions.find(s => s.id === storageData.currentSessionId);
    expect(currentSession.messages.length).toBeLessThanOrEqual(100);
  });

  test('should handle 5MB storage limit gracefully', async ({ page }) => {
    await page.goto('/');
    
    // 创建大量数据来接近5MB限制
    const largeText = 'x'.repeat(10000); // 10KB文本
    
    // 创建多个会话with大消息
    for (let i = 0; i < 10; i++) {
      await page.click('button:has-text("New Chat")');
      
      const chatInput = page.locator('textarea[placeholder*="Type your message"]');
      
      // 发送多条大消息
      for (let j = 0; j < 50; j++) {
        await chatInput.fill(`${largeText} - Session ${i} Message ${j}`);
        await page.click('button[type="submit"]');
        
        // 检查是否有存储错误
        const errorAlert = page.locator('[class*="error"], [class*="alert"]');
        if (await errorAlert.isVisible()) {
          // 如果出现错误，验证是存储相关的
          await expect(errorAlert).toContainText(/storage|limit|space/i);
          break;
        }
      }
    }
    
    // 验证应用仍然可用
    await page.reload();
    await expect(page.locator('h1')).toContainText('Azure Chat PWA');
  });

  test('should export chat sessions', async ({ page }) => {
    await page.goto('/');
    
    // 创建会话with消息
    await page.click('button:has-text("New Chat")');
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Export test message');
    await page.click('button[type="submit"]');
    
    // 等待保存
    await page.waitForTimeout(500);
    
    // 查找导出按钮
    const exportButton = page.locator('button:has-text("Export"), [aria-label*="Export"]');
    
    if (await exportButton.isVisible()) {
      // 设置下载监听
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;
      
      // 验证下载文件
      expect(download.suggestedFilename()).toMatch(/\.json$/);
    }
  });

  test('should import chat sessions', async ({ page }) => {
    await page.goto('/');
    
    // 准备导入数据
    const importData = {
      sessions: [{
        id: 'imported-session-1',
        title: 'Imported Session',
        model: 'gpt-4.1',
        messages: [
          { role: 'user', content: 'Imported message', timestamp: Date.now() }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }],
      currentSessionId: 'imported-session-1'
    };
    
    // 查找导入按钮
    const importButton = page.locator('button:has-text("Import"), [aria-label*="Import"]');
    
    if (await importButton.isVisible()) {
      // 创建文件选择器
      const fileChooserPromise = page.waitForEvent('filechooser');
      await importButton.click();
      
      const fileChooser = await fileChooserPromise;
      
      // 创建临时文件
      const buffer = Buffer.from(JSON.stringify(importData));
      await fileChooser.setFiles([{
        name: 'chat-export.json',
        mimeType: 'application/json',
        buffer
      }]);
      
      // 验证导入成功
      await page.waitForTimeout(500);
      const sessionList = page.locator('[class*="session-item"]');
      await expect(sessionList).toContainText('Imported Session');
    }
  });

  test('should clear old sessions when reaching limit', async ({ page }) => {
    await page.goto('/');
    
    // 创建50个会话
    for (let i = 0; i < 50; i++) {
      await page.click('button:has-text("New Chat")');
      
      // 给第一个会话添加标记
      if (i === 0) {
        const chatInput = page.locator('textarea[placeholder*="Type your message"]');
        await chatInput.fill('First session marker');
        await page.click('button[type="submit"]');
      }
      
      await page.waitForTimeout(50);
    }
    
    // 创建第51个会话
    await page.click('button:has-text("New Chat")');
    
    // 验证最旧的会话被删除
    const messages = await page.locator('text="First session marker"').count();
    expect(messages).toBe(0);
  });

  test('should persist selected model across sessions', async ({ page }) => {
    await page.goto('/');
    
    // 设置模型
    const modelSelector = page.locator('select[class*="model-selector"], [data-testid="model-selector"]');
    await modelSelector.selectOption({ label: 'O3' });
    
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    
    // 验证模型保持
    await expect(modelSelector).toHaveValue(/o3/i);
    
    // 刷新页面
    await page.reload();
    
    // 验证模型仍然保持
    await expect(modelSelector).toHaveValue(/o3/i);
  });

  test('should handle corrupted localStorage data gracefully', async ({ page }) => {
    // 设置损坏的数据
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('chat-sessions', 'corrupted-not-json-data');
    });
    
    // 刷新页面
    await page.reload();
    
    // 验证应用仍然可用
    await expect(page.locator('h1')).toContainText('Azure Chat PWA');
    await expect(page.locator('button:has-text("New Chat")')).toBeVisible();
  });

  test('should auto-save messages periodically', async ({ page }) => {
    await page.goto('/');
    
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    
    // 发送消息
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Auto-save test message');
    await page.click('button[type="submit"]');
    
    // 等待自动保存
    await page.waitForTimeout(1000);
    
    // 强制关闭页面
    const newPage = await page.context().newPage();
    await page.close();
    
    // 在新页面打开
    await newPage.goto('/');
    
    // 验证消息被保存
    const savedMessage = newPage.locator('text="Auto-save test message"');
    await expect(savedMessage).toBeVisible();
  });
});