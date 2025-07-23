# Azure Chat PWA

A Progressive Web App (PWA) chat application with Azure OpenAI integration and offline support.

## Features

- **PWA Support**: Install as a native app with offline capabilities
- **Offline Mode**: View chat history when offline, with clear indicators
- **Multiple AI Models**: Support for o3, o4-mini, GPT-4.1, GPT-4.1 mini, and GPT-4.1 nano
- **Rich Content Support**:
  - Markdown rendering with syntax highlighting
  - Mermaid diagram support
  - LaTeX math rendering
  - Image attachments (paste or upload)
- **Chat Management**:
  - Multiple chat sessions
  - localStorage persistence with size limits
  - Export/import chat history
- **Security**: XSS protection with DOMPurify

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Create a `.env` file based on `.env.example`:
```env
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
AZURE_OPENAI_API_VERSION=2023-05-15
```

3. Run the development server:
```bash
yarn dev
```

4. Build for production:
```bash
yarn build
yarn start
```

## Usage

- **New Chat**: Click "New Chat" to start a new conversation
- **Switch Models**: Use the model selector in the header
- **Attach Images**: Paste images or click the attachment button
- **Offline Mode**: The app works offline, showing cached conversations
- **Export Data**: Access chat history via browser developer tools

## Technical Stack

- Next.js 15 with App Router
- TypeScript
- PWA with next-pwa
- React Markdown with:
  - GitHub Flavored Markdown (GFM)
  - Mermaid diagrams
  - KaTeX math rendering
  - Syntax highlighting
- DOMPurify for XSS protection
- localStorage for data persistence

## Architecture

- `/src/app`: Next.js app router pages and API routes
- `/src/components`: React components
- `/src/hooks`: Custom React hooks
- `/src/lib`: Utility functions and services
- `/src/types`: TypeScript type definitions

## Limitations

- localStorage has a 5MB limit per origin
- Maximum 50 chat sessions
- Maximum 100 messages per session
- Images are stored as Base64 in localStorage