import { useState, useEffect } from 'react'
import type { Message } from '../types'

export interface ChatSession {
  id: string
  title: string
  timestamp: Date
  messages: Message[]
  preview?: string
}

const STORAGE_KEY = 'claude-code-chat-history'
const MAX_SESSIONS = 50

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Load sessions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Convert timestamp strings back to Date objects
        const sessionsWithDates = parsed.map((session: any) => ({
          ...session,
          timestamp: new Date(session.timestamp),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }))
        setSessions(sessionsWithDates)
      } catch (error) {
        console.error('Failed to load chat history:', error)
      }
    }
  }, [])

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    }
  }, [sessions])

  const createSession = (messages: Message[]): string => {
    const id = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const title = generateTitle(messages)
    const newSession: ChatSession = {
      id,
      title,
      timestamp: new Date(),
      messages,
      preview: messages[0]?.content.substring(0, 100)
    }

    setSessions(prev => {
      const updated = [newSession, ...prev]
      // Keep only the most recent MAX_SESSIONS
      return updated.slice(0, MAX_SESSIONS)
    })

    setCurrentSessionId(id)
    return id
  }

  const updateSession = (sessionId: string, messages: Message[]) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? {
            ...session,
            messages,
            preview: messages[0]?.content.substring(0, 100),
            title: session.title === 'New Chat' ? generateTitle(messages) : session.title
          }
        : session
    ))
  }

  const loadSession = (sessionId: string): ChatSession | null => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentSessionId(sessionId)
    }
    return session || null
  }

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null)
    }
  }

  const clearHistory = () => {
    setSessions([])
    setCurrentSessionId(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  // Generate a title from the first user message
  const generateTitle = (messages: Message[]): string => {
    const firstUserMessage = messages.find(m => m.role === 'user')
    if (!firstUserMessage) return 'New Chat'
    
    const content = firstUserMessage.content
    // Take first 50 characters or until first newline
    const title = content.split('\n')[0].substring(0, 50)
    return title.length < content.length ? `${title}...` : title
  }

  return {
    sessions,
    currentSessionId,
    createSession,
    updateSession,
    loadSession,
    deleteSession,
    clearHistory
  }
}