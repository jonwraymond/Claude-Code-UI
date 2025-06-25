import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import TabBar from './components/TabBar'
import ChatContainer from './components/ChatContainer'
import InputArea from './components/InputArea'
import AuthModal from './components/AuthModal'
import { useWebSocket } from './hooks/useWebSocket'
import { useChatHistory } from './hooks/useChatHistory'
import { useTabs } from './hooks/useTabs'
import type { Message, ModelType } from './types'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentModel, setCurrentModel] = useState<ModelType>('default')
  const [isConnecting, setIsConnecting] = useState(true)
  
  const {
    sessions,
    currentSessionId,
    createSession,
    updateSession,
    loadSession
  } = useChatHistory()
  
  const {
    tabs,
    activeTabId,
    createTab,
    closeTab,
    updateTab,
    switchTab,
    getActiveTab
  } = useTabs()
  
  const activeTab = getActiveTab()
  const messages = activeTab?.messages || []
  
  const { sendMessage, isConnected } = useWebSocket({
    onMessage: (message) => {
      console.log('Received message:', message)
      
      switch (message.type) {
        case 'auth_success':
          setIsAuthenticated(true)
          setIsConnecting(false)
          if (message.model) {
            setCurrentModel(message.model as ModelType)
          }
          break
          
        case 'auth_required':
        case 'auth_error':
          setIsAuthenticated(false)
          setIsConnecting(false)
          break
          
        case 'result':
          // Add assistant message
          if (activeTab) {
            const assistantMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: message.content || '',
              timestamp: new Date(),
              model: message.model
            }
            updateTab(activeTab.id, { messages: [...messages, assistantMessage] })
          }
          break
          
        case 'error':
          console.error('WebSocket error:', message.message)
          break
      }
    }
  })

  // Update chat history when messages change
  useEffect(() => {
    if (messages.length > 0 && activeTab) {
      if (!activeTab.sessionId) {
        const sessionId = createSession(messages)
        updateTab(activeTab.id, { sessionId })
      } else {
        updateSession(activeTab.sessionId, messages)
      }
    }
  }, [messages, activeTab, createSession, updateSession, updateTab])

  const handleSendMessage = (content: string, attachments?: any[]) => {
    if (!activeTab) return
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    }
    
    const newMessages = [...messages, userMessage]
    updateTab(activeTab.id, { messages: newMessages })
    
    // Update title if it's still "New Chat"
    if (activeTab.title === 'New Chat') {
      const title = content.split('\n')[0].substring(0, 30)
      updateTab(activeTab.id, { title: title.length < content.length ? `${title}...` : title })
    }
    
    // Send to server
    sendMessage({
      type: 'query',
      prompt: content,
      model: currentModel,
      maxTurns: 5,
      attachments
    })
  }

  const handleNewChat = () => {
    createTab()
  }

  const handleLoadChat = (chatId: string) => {
    const session = loadSession(chatId)
    if (session) {
      const newTabId = createTab()
      updateTab(newTabId, {
        title: session.title,
        messages: session.messages,
        sessionId: session.id
      })
    }
  }

  const handleModelChange = (model: ModelType) => {
    setCurrentModel(model)
  }

  const handleAuthenticate = (method: 'cli' | 'apikey', apiKey?: string) => {
    sendMessage({
      type: 'authenticate',
      method,
      apiKey
    })
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <Header 
        isConnected={isConnected}
        onNewChat={handleNewChat}
        onLoadChat={handleLoadChat}
        chatHistory={sessions}
      />
      
      <TabBar
        tabs={tabs.map(tab => ({ 
          id: tab.id, 
          title: tab.title, 
          isActive: tab.id === activeTabId 
        }))}
        activeTabId={activeTabId}
        onTabClick={switchTab}
        onTabClose={closeTab}
        onNewTab={createTab}
      />
      
      <ChatContainer 
        messages={messages}
        isAuthenticated={isAuthenticated}
      />
      
      <InputArea 
        onSendMessage={handleSendMessage}
        currentModel={currentModel}
        onModelChange={handleModelChange}
        disabled={!isAuthenticated}
      />
      
      <AnimatePresence>
        {(!isAuthenticated && !isConnecting) && (
          <AuthModal onAuthenticate={handleAuthenticate} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App