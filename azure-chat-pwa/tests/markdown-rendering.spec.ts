import { test, expect } from '@playwright/test';

test.describe('Markdown and Mermaid Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("New Chat")');
  });

  // Mock API response helper
  async function mockAIResponse(page: any, content: string) {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `data: {"choices": [{"delta": {"content": "${content}"}}]}\n\ndata: [DONE]\n\n`
      });
    });
  }

  test('should render basic markdown formatting', async ({ page }) => {
    // Mock AI response with markdown
    const markdownContent = `
# Heading 1
## Heading 2
### Heading 3

**Bold text** and *italic text* and ***bold italic***

- Bullet point 1
- Bullet point 2
  - Nested bullet

1. Numbered item 1
2. Numbered item 2

> This is a blockquote

[Link to OpenAI](https://openai.com)
    `.trim();

    await mockAIResponse(page, markdownContent);

    // Send message to trigger response
    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Test markdown rendering');
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(1000);

    // Verify markdown elements are rendered
    const aiMessage = page.locator('[class*="message"][class*="assistant"]').last();
    
    await expect(aiMessage.locator('h1')).toContainText('Heading 1');
    await expect(aiMessage.locator('h2')).toContainText('Heading 2');
    await expect(aiMessage.locator('h3')).toContainText('Heading 3');
    await expect(aiMessage.locator('strong')).toContainText('Bold text');
    await expect(aiMessage.locator('em')).toContainText('italic text');
    await expect(aiMessage.locator('ul li')).toContainText('Bullet point 1');
    await expect(aiMessage.locator('ol li')).toContainText('Numbered item 1');
    await expect(aiMessage.locator('blockquote')).toContainText('This is a blockquote');
    await expect(aiMessage.locator('a[href="https://openai.com"]')).toContainText('Link to OpenAI');
  });

  test('should render code blocks with syntax highlighting', async ({ page }) => {
    const codeContent = `
Here's a Python example:

\`\`\`python
def hello_world():
    print("Hello, World!")
    return 42

# Call the function
result = hello_world()
\`\`\`

And JavaScript:

\`\`\`javascript
const greet = (name) => {
    console.log(\`Hello, \${name}!\`);
};

greet("Azure");
\`\`\`
    `.trim();

    await mockAIResponse(page, codeContent);

    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Show me code examples');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    const aiMessage = page.locator('[class*="message"][class*="assistant"]').last();
    
    // Check code blocks exist
    const codeBlocks = aiMessage.locator('pre code');
    await expect(codeBlocks).toHaveCount(2);
    
    // Check syntax highlighting classes
    await expect(codeBlocks.first()).toHaveAttribute('class', /language-python|hljs/);
    await expect(codeBlocks.last()).toHaveAttribute('class', /language-javascript|hljs/);
    
    // Check copy button
    const copyButtons = aiMessage.locator('button:has-text("Copy"), [aria-label*="Copy"]');
    await expect(copyButtons).toHaveCount(2);
  });

  test('should render inline code', async ({ page }) => {
    const inlineCodeContent = 'Use `npm install` or `yarn add` to install packages.';
    
    await mockAIResponse(page, inlineCodeContent);

    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('How to install?');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    const aiMessage = page.locator('[class*="message"][class*="assistant"]').last();
    const inlineCode = aiMessage.locator('code').filter({ hasNotText: /npm install|yarn add/ });
    
    await expect(aiMessage.locator('code')).toHaveCount(2);
  });

  test('should render tables correctly', async ({ page }) => {
    const tableContent = `
| Model | Parameters | Context |
|-------|------------|---------|
| GPT-4.1 | 175B | 128k |
| O3 | 100B | 64k |
| O4-mini | 7B | 32k |
    `.trim();

    await mockAIResponse(page, tableContent);

    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Show me model comparison');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    const aiMessage = page.locator('[class*="message"][class*="assistant"]').last();
    
    // Check table structure
    await expect(aiMessage.locator('table')).toBeVisible();
    await expect(aiMessage.locator('thead')).toBeVisible();
    await expect(aiMessage.locator('tbody')).toBeVisible();
    await expect(aiMessage.locator('th')).toHaveCount(3);
    await expect(aiMessage.locator('tbody tr')).toHaveCount(3);
  });

  test('should render math equations with KaTeX', async ({ page }) => {
    const mathContent = `
Inline math: $E = mc^2$

Block math:
$$
\\frac{d}{dx} \\int_{a}^{x} f(t) dt = f(x)
$$

Another equation:
$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$
    `.trim();

    await mockAIResponse(page, mathContent);

    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Show me math equations');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    const aiMessage = page.locator('[class*="message"][class*="assistant"]').last();
    
    // Check for KaTeX rendered elements
    await expect(aiMessage.locator('.katex')).toHaveCount(3);
    await expect(aiMessage.locator('.katex-display')).toHaveCount(2);
  });

  test('should render mermaid diagrams', async ({ page }) => {
    const mermaidContent = `
Here's a flowchart:

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
\`\`\`

And a sequence diagram:

\`\`\`mermaid
sequenceDiagram
    User->>+API: Request
    API->>+Database: Query
    Database-->>-API: Results
    API-->>-User: Response
\`\`\`
    `.trim();

    await mockAIResponse(page, mermaidContent);

    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Show me diagrams');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000); // Mermaid rendering takes time

    const aiMessage = page.locator('[class*="message"][class*="assistant"]').last();
    
    // Check for mermaid rendered SVGs
    const mermaidDiagrams = aiMessage.locator('.mermaid svg, [data-processed="true"] svg');
    await expect(mermaidDiagrams).toHaveCount(2);
  });

  test('should handle copy functionality for code blocks', async ({ page }) => {
    const codeContent = `
\`\`\`javascript
const testFunction = () => {
    return "Copy me!";
};
\`\`\`
    `.trim();

    await mockAIResponse(page, codeContent);

    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Code to copy');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    const aiMessage = page.locator('[class*="message"][class*="assistant"]').last();
    const copyButton = aiMessage.locator('button:has-text("Copy"), [aria-label*="Copy"]').first();
    
    // Test copy functionality
    await copyButton.click();
    
    // Check if button text changes to indicate success
    await expect(copyButton).toContainText(/Copied|✓/);
  });

  test('should sanitize potentially dangerous content', async ({ page }) => {
    const dangerousContent = `
<script>alert('XSS')</script>
<img src="x" onerror="alert('XSS')">
<iframe src="javascript:alert('XSS')"></iframe>

Safe content: **This should render**
    `.trim();

    await mockAIResponse(page, dangerousContent);

    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Test security');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    const aiMessage = page.locator('[class*="message"][class*="assistant"]').last();
    
    // Verify dangerous elements are not rendered
    await expect(aiMessage.locator('script')).toHaveCount(0);
    await expect(aiMessage.locator('iframe')).toHaveCount(0);
    
    // But safe content should render
    await expect(aiMessage.locator('strong')).toContainText('This should render');
  });

  test('should render task lists', async ({ page }) => {
    const taskListContent = `
Todo list:
- [x] Completed task
- [ ] Pending task
- [ ] Another pending task
- [x] Another completed task
    `.trim();

    await mockAIResponse(page, taskListContent);

    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Show todo list');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    const aiMessage = page.locator('[class*="message"][class*="assistant"]').last();
    
    // Check for task list items
    const checkboxes = aiMessage.locator('input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(4);
    
    // Verify checked states
    await expect(checkboxes.nth(0)).toBeChecked();
    await expect(checkboxes.nth(1)).not.toBeChecked();
    await expect(checkboxes.nth(3)).toBeChecked();
  });

  test('should handle mixed content rendering', async ({ page }) => {
    const mixedContent = `
# Project Overview

This project uses **Next.js** with \`TypeScript\`.

## Features
1. PWA Support
2. Offline functionality

\`\`\`typescript
interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}
\`\`\`

> Note: Remember to run $npm install$ first!

[Documentation](https://docs.example.com)
    `.trim();

    await mockAIResponse(page, mixedContent);

    const chatInput = page.locator('textarea[placeholder*="Type your message"]');
    await chatInput.fill('Project info');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    const aiMessage = page.locator('[class*="message"][class*="assistant"]').last();
    
    // Verify all elements render correctly together
    await expect(aiMessage.locator('h1')).toBeVisible();
    await expect(aiMessage.locator('h2')).toBeVisible();
    await expect(aiMessage.locator('strong')).toBeVisible();
    await expect(aiMessage.locator('code').first()).toBeVisible();
    await expect(aiMessage.locator('pre code')).toBeVisible();
    await expect(aiMessage.locator('blockquote')).toBeVisible();
    await expect(aiMessage.locator('a')).toBeVisible();
    await expect(aiMessage.locator('.katex')).toBeVisible();
  });
});