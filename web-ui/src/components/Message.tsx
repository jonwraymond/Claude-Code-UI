import { motion } from 'framer-motion'
import { UserIcon, CpuChipIcon } from '@heroicons/react/24/outline'
import type { Message as MessageType } from '../types'
import { getModelName } from '../types'
import { useEffect, useState } from 'react'

interface MessageProps {
  message: MessageType
  index: number
}

export default function Message({ message, index }: MessageProps) {
  const [displayedContent, setDisplayedContent] = useState('')
  const isUser = message.role === 'user'

  // Typewriter effect for assistant messages
  useEffect(() => {
    if (isUser) {
      setDisplayedContent(message.content)
      return
    }

    setDisplayedContent('')
    let i = 0
    const timer = setInterval(() => {
      if (i < message.content.length) {
        setDisplayedContent(message.content.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
      }
    }, 15) // Adjust speed here

    return () => clearInterval(timer)
  }, [message.content, isUser])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`flex space-x-4 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser 
          ? 'bg-accent-blue text-white' 
          : 'bg-accent-green text-white'
      }`}>
        {isUser ? (
          <UserIcon className="w-4 h-4" />
        ) : (
          <CpuChipIcon className="w-4 h-4" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'text-right' : ''}`}>
        {/* Header */}
        <div className={`flex items-center space-x-2 mb-2 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-sm font-medium text-text-primary">
            {isUser ? 'You' : 'Claude'}
          </span>
          {message.model && !isUser && (
            <span className="text-xs px-2 py-1 rounded-full bg-bg-tertiary text-text-secondary">
              {getModelName(message.model as any)}
            </span>
          )}
          <span className="text-xs text-text-secondary">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>

        {/* Content */}
        <motion.div 
          className={`prose prose-invert max-w-none ${
            isUser 
              ? 'bg-accent-blue/10 border border-accent-blue/20 text-right' 
              : 'bg-bg-secondary border border-border'
          } rounded-lg p-4`}
          layout
        >
          {isUser ? (
            <p className="text-text-primary whitespace-pre-wrap m-0">{displayedContent}</p>
          ) : (
            <div className="text-text-primary">
              <ReactMarkdown 
                content={displayedContent}
                className="prose prose-invert prose-sm max-w-none"
              />
              {displayedContent.length < message.content.length && (
                <span className="inline-block w-2 h-4 bg-accent-green animate-pulse ml-1" />
              )}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}

// Simple markdown renderer component
function ReactMarkdown({ content, className }: { content: string; className?: string }) {
  // Basic markdown parsing for code blocks and formatting
  const parseMarkdown = (text: string) => {
    // Code blocks
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, _lang, code) => {
      return `<pre class="bg-bg-primary p-3 rounded border overflow-x-auto"><code class="text-accent-yellow">${code.trim()}</code></pre>`
    })
    
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code class="bg-bg-primary px-1 rounded text-accent-yellow">$1</code>')
    
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Line breaks
    text = text.replace(/\n/g, '<br />')
    
    return text
  }

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  )
}