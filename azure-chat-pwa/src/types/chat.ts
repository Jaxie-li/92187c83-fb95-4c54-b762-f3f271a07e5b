export type AIModel = 'o3' | 'o4-mini' | 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4.1-nano'

export interface AIModelConfig {
  id: AIModel
  name: string
  description: string
  maxTokens: number
  temperature: number
}

export const AI_MODELS: Record<AIModel, AIModelConfig> = {
  'o3': {
    id: 'o3',
    name: 'O3',
    description: 'Most capable model for complex tasks',
    maxTokens: 8192,
    temperature: 0.7,
  },
  'o4-mini': {
    id: 'o4-mini',
    name: 'O4 Mini',
    description: 'Balanced performance and cost',
    maxTokens: 4096,
    temperature: 0.7,
  },
  'gpt-4.1': {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: 'Advanced reasoning capabilities',
    maxTokens: 8192,
    temperature: 0.7,
  },
  'gpt-4.1-mini': {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    description: 'Efficient version of GPT-4.1',
    maxTokens: 4096,
    temperature: 0.7,
  },
  'gpt-4.1-nano': {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    description: 'Fast responses for simple tasks',
    maxTokens: 2048,
    temperature: 0.7,
  },
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  model?: AIModel
  images?: string[]
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
  model: AIModel
}