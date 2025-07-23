'use client'

import { useEffect, useRef } from 'react'
import { useChat } from '@/hooks/useChat'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { SessionList } from './SessionList'
import { ModelSelector } from './ModelSelector'

export function ChatInterface() {
  const {
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
  } = useChat()
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [currentSession?.messages])

  // Create initial session if none exists
  useEffect(() => {
    if (sessions.length === 0 && !currentSession) {
      createSession('gpt-4.1')
    }
  }, [sessions, currentSession, createSession])

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <SessionList
        sessions={sessions}
        currentSessionId={currentSession?.id}
        onSelectSession={loadSession}
        onCreateSession={createSession}
        onDeleteSession={deleteSession}
      />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">
            {currentSession?.title || 'New Chat'}
          </h1>
          {currentSession && (
            <ModelSelector
              currentModel={currentSession.model}
              onModelChange={updateSessionModel}
            />
          )}
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={clearError}
                className="text-red-700 hover:text-red-900"
              >
                ×
              </button>
            </div>
          )}
          
          {currentSession?.messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg px-4 py-2">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  )
}