import { test, expect } from '@playwright/test';

test.describe('PWA Offline Functionality', () => {
  test('should install service worker', async ({ page }) => {
    await page.goto('/');
    
    // 等待service worker注册
    const swRegistration = await page.evaluate(() => {
      return navigator.serviceWorker.ready;
    });
    
    expect(swRegistration).toBeTruthy();
  });

  test('should show offline indicator when offline', async ({ page, context }) => {
    await page.goto('/');
    
    // 模拟离线状态
    await context.setOffline(true);
    
    // 等待离线指示器出现
    const offlineIndicator = page.locator('[class*="offline"], [class*="network-status"]');
    await expect(offlineIndicator).toBeVisible();
    await expect(offlineIndicator).toContainText(/offline|no connection/i);
  });

  test('should disable message sending when offline', async ({ page, context }) => {
    await page.goto('/');
    
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    
    // 模拟离线状态
    await context.setOffline(true);
    
    // 尝试发送消息
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    const sendButton = page.locator('button[type="submit"]');
    
    await chatInput.fill('Test offline message');
    
    // 验证发送按钮被禁用或显示离线提示
    const isDisabled = await sendButton.isDisabled();
    const hasOfflineClass = await sendButton.evaluate(el => 
      el.className.includes('disabled') || el.className.includes('offline')
    );
    
    expect(isDisabled || hasOfflineClass).toBeTruthy();
  });

  test('should show offline page when navigating offline', async ({ page, context }) => {
    // 先访问一次以缓存资源
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 设置离线
    await context.setOffline(true);
    
    // 导航到离线页面
    await page.goto('/offline');
    
    // 验证离线页面内容
    await expect(page.locator('h1, h2')).toContainText(/offline/i);
    await expect(page.locator('text=/no internet connection/i')).toBeVisible();
  });

  test('should cache and display previous chat sessions offline', async ({ page, context }) => {
    await page.goto('/');
    
    // 创建会话并发送消息
    await page.click('button:has-text("New Chat")');
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Message before going offline');
    await page.click('button[type="submit"]');
    
    // 等待消息保存
    await page.waitForTimeout(1000);
    
    // 模拟离线
    await context.setOffline(true);
    
    // 刷新页面
    await page.reload();
    
    // 验证历史消息仍然可见
    const userMessage = page.locator('[class*="message"][class*="user"]');
    await expect(userMessage).toContainText('Message before going offline');
  });

  test('should restore online functionality when connection returns', async ({ page, context }) => {
    await page.goto('/');
    
    // 先离线
    await context.setOffline(true);
    await page.waitForTimeout(500);
    
    // 验证离线状态
    const offlineIndicator = page.locator('[class*="offline"], [class*="network-status"]');
    await expect(offlineIndicator).toBeVisible();
    
    // 恢复在线
    await context.setOffline(false);
    await page.waitForTimeout(500);
    
    // 验证在线状态
    const onlineIndicator = page.locator('[class*="online"], [class*="network-status"]');
    await expect(onlineIndicator).toBeVisible();
    
    // 验证可以发送消息
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    const sendButton = page.locator('button[type="submit"]');
    
    await chatInput.fill('Back online!');
    await expect(sendButton).toBeEnabled();
  });

  test('should handle offline navigation gracefully', async ({ page, context }) => {
    await page.goto('/');
    
    // 创建多个会话
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("New Chat")');
      await page.waitForTimeout(100);
    }
    
    // 设置离线
    await context.setOffline(true);
    
    // 尝试在会话间切换
    const sessionItems = page.locator('[class*="session-item"]');
    await sessionItems.nth(1).click();
    
    // 验证切换成功且没有错误
    await expect(page.locator('[class*="active"], [class*="selected"]')).toBeVisible();
  });

  test('should cache static assets for offline use', async ({ page, context }) => {
    // 访问页面以触发缓存
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 获取所有缓存的资源
    const cachedResources = await page.evaluate(async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const resources = [];
        
        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          resources.push(...requests.map(r => r.url));
        }
        
        return resources;
      }
      return [];
    });
    
    // 验证关键资源被缓存
    expect(cachedResources.some(url => url.includes('.js'))).toBeTruthy();
    expect(cachedResources.some(url => url.includes('.css'))).toBeTruthy();
  });

  test('should show appropriate offline message in chat', async ({ page, context }) => {
    await page.goto('/');
    
    // 创建新会话
    await page.click('button:has-text("New Chat")');
    
    // 设置离线
    await context.setOffline(true);
    
    // 尝试发送消息
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Offline test');
    
    // 检查是否有离线提示
    const offlineMessage = page.locator('text=/offline|no connection|network error/i');
    await expect(offlineMessage).toBeVisible();
  });

  test('should maintain session state during offline/online transitions', async ({ page, context }) => {
    await page.goto('/');
    
    // 创建会话并设置模型
    await page.click('button:has-text("New Chat")');
    const modelSelector = page.locator('select[class*="model-selector"], [data-testid="model-selector"]');
    await modelSelector.selectOption({ label: 'GPT-4.1' });
    
    // 发送消息
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('State test message');
    await page.click('button[type="submit"]');
    
    // 离线
    await context.setOffline(true);
    await page.waitForTimeout(500);
    
    // 在线
    await context.setOffline(false);
    await page.waitForTimeout(500);
    
    // 验证状态保持
    await expect(modelSelector).toHaveValue(/gpt-4\.1/i);
    await expect(page.locator('[class*="message"][class*="user"]')).toContainText('State test message');
  });
});