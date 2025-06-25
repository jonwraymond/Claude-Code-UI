import { useState, useEffect, useRef, useCallback } from 'react'
import type { WebSocketMessage } from '../types'

interface UseWebSocketProps {
  onMessage: (message: any) => void
  url?: string
}

export function useWebSocket({ onMessage, url = 'ws://localhost:3000' }: UseWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const connect = useCallback(() => {
    try {
      setConnectionStatus('connecting')
      wsRef.current = new WebSocket(url)

      wsRef.current.onopen = () => {
        setIsConnected(true)
        setConnectionStatus('connected')
        console.log('WebSocket connected')
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          onMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      wsRef.current.onclose = () => {
        setIsConnected(false)
        setConnectionStatus('disconnected')
        console.log('WebSocket disconnected')
        
        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('disconnected')
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      setConnectionStatus('disconnected')
    }
  }, [url, onMessage])

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    connectionStatus,
    sendMessage,
    disconnect
  }
}