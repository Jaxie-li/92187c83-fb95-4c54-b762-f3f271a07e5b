import { AIModel, AI_MODELS } from '@/types/chat'

export interface AzureOpenAIConfig {
  apiKey: string
  endpoint: string
  apiVersion: string
}

export interface ChatCompletionRequest {
  model: AIModel
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finishReason: string
  }>
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

interface AzureOpenAIChoice {
  index: number
  message: {
    role: string
    content: string
  }
  finish_reason: string
}

export class AzureOpenAIService {
  private config: AzureOpenAIConfig

  constructor(config: AzureOpenAIConfig) {
    this.config = config
  }

  private getDeploymentName(model: AIModel): string {
    // Map model IDs to Azure deployment names
    const deploymentMap: Record<AIModel, string> = {
      'o3': 'o3-deployment',
      'o4-mini': 'o4-mini-deployment',
      'gpt-4.1': 'gpt-4-1-deployment',
      'gpt-4.1-mini': 'gpt-4-1-mini-deployment',
      'gpt-4.1-nano': 'gpt-4-1-nano-deployment',
    }
    return deploymentMap[model]
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const modelConfig = AI_MODELS[request.model]
    const deploymentName = this.getDeploymentName(request.model)
    
    const url = `${this.config.endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${this.config.apiVersion}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.apiKey,
      },
      body: JSON.stringify({
        messages: request.messages,
        temperature: request.temperature ?? modelConfig.temperature,
        max_tokens: request.maxTokens ?? modelConfig.maxTokens,
        stream: request.stream ?? false,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Azure OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    
    return {
      id: data.id,
      object: data.object,
      created: data.created,
      model: data.model,
      choices: data.choices.map((choice: AzureOpenAIChoice) => ({
        index: choice.index,
        message: {
          role: choice.message.role,
          content: choice.message.content,
        },
        finishReason: choice.finish_reason,
      })),
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    }
  }

  async createStreamingChatCompletion(
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void,
    onComplete?: () => void
  ): Promise<void> {
    const modelConfig = AI_MODELS[request.model]
    const deploymentName = this.getDeploymentName(request.model)
    
    const url = `${this.config.endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${this.config.apiVersion}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.apiKey,
      },
      body: JSON.stringify({
        messages: request.messages,
        temperature: request.temperature ?? modelConfig.temperature,
        max_tokens: request.maxTokens ?? modelConfig.maxTokens,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Azure OpenAI API error: ${response.status} - ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('Response body is not readable')

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              onComplete?.()
              return
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                onChunk(content)
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}