import { useState, useEffect, useCallback } from 'react'
import { ChatSession, ChatMessage, AIModel } from '@/types/chat'
import { ChatStorageService } from '@/lib/storage'
import { useNetworkStatus } from './useNetworkStatus'

interface UseChatReturn {
  sessions: ChatSession[]
  currentSession: ChatSession | null
  isLoading: boolean
  error: string | null
  createSession: (model: AIModel) => string
  loadSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  sendMessage: (content: string, images?: string[]) => Promise<void>
  updateSessionModel: (model: AIModel) => void
  clearError: () => void
}

export function useChat(): UseChatReturn {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isOnline } = useNetworkStatus()
  
  const storage = ChatStorageService.getInstance()

  // Load sessions on mount
  useEffect(() => {
    const loadedSessions = storage.getAllSessions()
    setSessions(loadedSessions)
    
    const currentSessionId = storage.getCurrentSessionId()
    if (currentSessionId) {
      const session = storage.getSession(currentSessionId)
      if (session) {
        setCurrentSession(session)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createSession = useCallback((model: AIModel): string => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model,
    }
    
    storage.saveSession(newSession)
    storage.setCurrentSessionId(newSession.id)
    setCurrentSession(newSession)
    setSessions(prev => [newSession, ...prev])
    
    return newSession.id
  }, [storage])

  const loadSession = useCallback((sessionId: string) => {
    const session = storage.getSession(sessionId)
    if (session) {
      setCurrentSession(session)
      storage.setCurrentSessionId(sessionId)
    }
  }, [storage])

  const deleteSession = useCallback((sessionId: string) => {
    storage.deleteSession(sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(null)
      storage.clearCurrentSessionId()
    }
  }, [storage, currentSession])

  const sendMessage = useCallback(async (content: string, images?: string[]) => {
    if (!currentSession) {
      setError('No active session')
      return
    }

    if (!isOnline) {
      setError('You are offline. Cannot send messages.')
      return
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content,
      timestamp: Date.now(),
      images,
    }

    // Update session with user message
    const updatedSession: ChatSession = {
      ...currentSession,
      messages: [...currentSession.messages, userMessage],
      updatedAt: Date.now(),
    }

    // Update title if it's the first message
    if (updatedSession.messages.length === 1) {
      updatedSession.title = content.slice(0, 50) + (content.length > 50 ? '...' : '')
    }

    setCurrentSession(updatedSession)
    storage.saveSession(updatedSession)

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedSession.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          model: currentSession.model,
          stream: false,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get response: ${response.statusText}`)
      }

      const data = await response.json()

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: data.content,
        timestamp: Date.now(),
        model: currentSession.model,
      }

      const finalSession: ChatSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, assistantMessage],
        updatedAt: Date.now(),
      }

      setCurrentSession(finalSession)
      storage.saveSession(finalSession)
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }, [currentSession, isOnline, storage])

  const updateSessionModel = useCallback((model: AIModel) => {
    if (!currentSession) return

    const updatedSession: ChatSession = {
      ...currentSession,
      model,
      updatedAt: Date.now(),
    }

    setCurrentSession(updatedSession)
    storage.saveSession(updatedSession)
  }, [currentSession, storage])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    sessions,
    currentSession,
    isLoading,
    error,
    createSession,
    loadSession,
    deleteSession,
    sendMessage,
    updateSessionModel,
    clearError,
  }
}