import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef } from 'react'
import type { Message as MessageType } from '../types'
import Message from './Message'
import WelcomeScreen from './WelcomeScreen'

interface ChatContainerProps {
  messages: MessageType[]
  isAuthenticated: boolean
}

export default function ChatContainer({ messages, isAuthenticated }: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-6 py-4 space-y-6"
    >
      <AnimatePresence mode="wait">
        {messages.length === 0 && isAuthenticated ? (
          <WelcomeScreen key="welcome" />
        ) : (
          <motion.div 
            key="messages"
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {messages.map((message, index) => (
              <Message 
                key={message.id} 
                message={message}
                index={index}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}