import { ChatSession } from '@/types/chat'

const STORAGE_KEY_PREFIX = 'azure-chat-pwa'
const SESSIONS_KEY = `${STORAGE_KEY_PREFIX}:sessions`
const CURRENT_SESSION_KEY = `${STORAGE_KEY_PREFIX}:current-session`
const MAX_SESSIONS = 50
const MAX_MESSAGES_PER_SESSION = 100
const MAX_STORAGE_SIZE = 5 * 1024 * 1024 // 5MB

export class ChatStorageService {
  private static instance: ChatStorageService
  
  static getInstance(): ChatStorageService {
    if (!ChatStorageService.instance) {
      ChatStorageService.instance = new ChatStorageService()
    }
    return ChatStorageService.instance
  }

  private constructor() {}

  private getStorageSize(): number {
    let size = 0
    for (const key in localStorage) {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        size += localStorage.getItem(key)?.length || 0
      }
    }
    return size * 2 // Approximate size in bytes (UTF-16)
  }

  private cleanupOldSessions(): void {
    const sessions = this.getAllSessions()
    
    // Sort by last updated time
    sessions.sort((a, b) => b.updatedAt - a.updatedAt)
    
    // Remove old sessions if we exceed the limit
    if (sessions.length > MAX_SESSIONS) {
      const sessionsToRemove = sessions.slice(MAX_SESSIONS)
      sessionsToRemove.forEach(session => {
        this.deleteSession(session.id)
      })
    }

    // Check storage size and remove oldest sessions if needed
    while (this.getStorageSize() > MAX_STORAGE_SIZE && sessions.length > 1) {
      const oldestSession = sessions.pop()
      if (oldestSession) {
        this.deleteSession(oldestSession.id)
      }
    }
  }

  getAllSessions(): ChatSession[] {
    try {
      const sessionsJson = localStorage.getItem(SESSIONS_KEY)
      return sessionsJson ? JSON.parse(sessionsJson) : []
    } catch (error) {
      console.error('Error loading sessions:', error)
      return []
    }
  }

  getSession(sessionId: string): ChatSession | null {
    try {
      const sessionKey = `${STORAGE_KEY_PREFIX}:session:${sessionId}`
      const sessionJson = localStorage.getItem(sessionKey)
      return sessionJson ? JSON.parse(sessionJson) : null
    } catch (error) {
      console.error('Error loading session:', error)
      return null
    }
  }

  saveSession(session: ChatSession): void {
    try {
      // Limit messages per session
      if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
        session.messages = session.messages.slice(-MAX_MESSAGES_PER_SESSION)
      }

      const sessionKey = `${STORAGE_KEY_PREFIX}:session:${session.id}`
      localStorage.setItem(sessionKey, JSON.stringify(session))

      // Update sessions index
      const sessions = this.getAllSessions()
      const existingIndex = sessions.findIndex(s => s.id === session.id)
      
      const sessionMeta = {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        model: session.model,
      }

      if (existingIndex >= 0) {
        sessions[existingIndex] = sessionMeta as ChatSession
      } else {
        sessions.push(sessionMeta as ChatSession)
      }

      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
      
      // Cleanup if needed
      this.cleanupOldSessions()
    } catch (error) {
      console.error('Error saving session:', error)
      // If quota exceeded, try to cleanup and retry
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.cleanupOldSessions()
        try {
          const sessionKey = `${STORAGE_KEY_PREFIX}:session:${session.id}`
          localStorage.setItem(sessionKey, JSON.stringify(session))
        } catch (retryError) {
          console.error('Failed to save after cleanup:', retryError)
          throw retryError
        }
      }
    }
  }

  deleteSession(sessionId: string): void {
    try {
      const sessionKey = `${STORAGE_KEY_PREFIX}:session:${sessionId}`
      localStorage.removeItem(sessionKey)

      const sessions = this.getAllSessions()
      const filteredSessions = sessions.filter(s => s.id !== sessionId)
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(filteredSessions))
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  getCurrentSessionId(): string | null {
    return localStorage.getItem(CURRENT_SESSION_KEY)
  }

  setCurrentSessionId(sessionId: string): void {
    localStorage.setItem(CURRENT_SESSION_KEY, sessionId)
  }

  clearCurrentSessionId(): void {
    localStorage.removeItem(CURRENT_SESSION_KEY)
  }

  exportSessions(): string {
    const sessions = this.getAllSessions()
    const fullSessions = sessions.map(meta => this.getSession(meta.id)).filter(Boolean)
    return JSON.stringify(fullSessions, null, 2)
  }

  importSessions(data: string): void {
    try {
      const sessions = JSON.parse(data) as ChatSession[]
      sessions.forEach(session => {
        if (session && session.id && session.messages) {
          this.saveSession(session)
        }
      })
    } catch (error) {
      console.error('Error importing sessions:', error)
      throw new Error('Invalid session data format')
    }
  }

  clearAllData(): void {
    const keysToRemove: string[] = []
    for (const key in localStorage) {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
}