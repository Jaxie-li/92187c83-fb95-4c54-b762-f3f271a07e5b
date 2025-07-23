'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

interface ChatInputProps {
  onSendMessage: (content: string, images?: string[]) => void
  isLoading: boolean
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [images, setImages] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isOnline } = useNetworkStatus()

  const handleSend = () => {
    if (input.trim() || images.length > 0) {
      onSendMessage(input.trim(), images.length > 0 ? images : undefined)
      setInput('')
      setImages([])
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && isOnline) {
        handleSend()
      }
    }
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'))
    
    for (const item of imageItems) {
      const file = item.getAsFile()
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result
          if (result && typeof result === 'string') {
            setImages(prev => [...prev, result])
          }
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result
          if (result && typeof result === 'string') {
            setImages(prev => [...prev, result])
          }
        }
        reader.readAsDataURL(file)
      }
    })
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="border-t p-4">
      {images.length > 0 && (
        <div className="mb-2 flex gap-2 flex-wrap">
          {images.map((image, index) => (
            <div key={index} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={`Attachment ${index + 1}`}
                className="h-20 w-20 object-cover rounded-md"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={isOnline ? "Type a message..." : "You&apos;re offline"}
          disabled={isLoading || !isOnline}
          className="flex-1 resize-none rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          rows={1}
        />
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || !isOnline}
          className="p-2 rounded-lg border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Attach images"
        >
          📎
        </button>
        
        <button
          onClick={handleSend}
          disabled={isLoading || !isOnline || (!input.trim() && images.length === 0)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
      
      {!isOnline && (
        <p className="text-sm text-red-600 mt-2">
          You&apos;re offline. Messages cannot be sent until you&apos;re back online.
        </p>
      )}
    </div>
  )
}