import { NextRequest, NextResponse } from 'next/server'
import { AzureOpenAIService } from '@/lib/azure-openai'
import { AIModel } from '@/types/chat'

const azureOpenAI = new AzureOpenAIService({
  apiKey: process.env.AZURE_OPENAI_API_KEY || '',
  endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2023-05-15',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, model, stream = false } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    if (!model || !['o3', 'o4-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano'].includes(model)) {
      return NextResponse.json(
        { error: 'Valid model is required' },
        { status: 400 }
      )
    }

    if (stream) {
      // Handle streaming response
      const encoder = new TextEncoder()
      const stream = new TransformStream()
      const writer = stream.writable.getWriter()

      // Start streaming in the background
      azureOpenAI.createStreamingChatCompletion(
        {
          model: model as AIModel,
          messages,
          stream: true,
        },
        async (chunk) => {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`))
        },
        async () => {
          await writer.write(encoder.encode('data: [DONE]\n\n'))
          await writer.close()
        }
      ).catch(async (error) => {
        console.error('Streaming error:', error)
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`))
        await writer.close()
      })

      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      // Handle regular response
      const response = await azureOpenAI.createChatCompletion({
        model: model as AIModel,
        messages,
      })

      return NextResponse.json({
        content: response.choices[0]?.message.content || '',
        usage: response.usage,
      })
    }
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}