import { useState } from 'react'
import { motion } from 'framer-motion'
import { CommandLineIcon, KeyIcon } from '@heroicons/react/24/outline'

interface AuthModalProps {
  onAuthenticate: (method: 'cli' | 'apikey', apiKey?: string) => void
}

export default function AuthModal({ onAuthenticate }: AuthModalProps) {
  const [authMethod, setAuthMethod] = useState<'cli' | 'apikey' | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCliLogin = async () => {
    setIsLoading(true)
    onAuthenticate('cli')
  }

  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apiKey.trim()) return
    
    setIsLoading(true)
    onAuthenticate('apikey', apiKey)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-bg-secondary border border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            Welcome to Claude Code
          </h2>
          <p className="text-text-secondary">
            Choose how you'd like to authenticate
          </p>
        </div>

        {!authMethod ? (
          <div className="space-y-4">
            {/* Claude CLI Option */}
            <motion.button
              onClick={() => setAuthMethod('cli')}
              className="w-full bg-bg-tertiary hover:bg-border border border-border rounded-xl p-4 text-left transition-colors group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-accent-blue/20 rounded-lg flex items-center justify-center">
                  <CommandLineIcon className="w-6 h-6 text-accent-blue" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary group-hover:text-accent-blue transition-colors">
                    Use Claude CLI
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Connect to your existing Claude CLI session
                  </p>
                </div>
              </div>
            </motion.button>

            {/* API Key Option */}
            <motion.button
              onClick={() => setAuthMethod('apikey')}
              className="w-full bg-bg-tertiary hover:bg-border border border-border rounded-xl p-4 text-left transition-colors group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-accent-green/20 rounded-lg flex items-center justify-center">
                  <KeyIcon className="w-6 h-6 text-accent-green" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary group-hover:text-accent-green transition-colors">
                    Use API Key
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Enter your Anthropic API key directly
                  </p>
                </div>
              </div>
            </motion.button>
          </div>
        ) : authMethod === 'cli' ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="bg-bg-tertiary border border-border rounded-xl p-4">
              <h3 className="font-semibold text-text-primary mb-3">Connecting to Claude CLI...</h3>
              <p className="text-sm text-text-secondary mb-3">
                Make sure you're logged into Claude CLI:
              </p>
              <div className="bg-bg-primary rounded-lg p-3 font-mono text-sm text-accent-yellow border border-border mb-3">
                claude login
              </div>
              <p className="text-sm text-text-secondary">
                The web UI will automatically connect to your CLI session.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setAuthMethod(null)}
                className="flex-1 py-2 px-4 border border-border text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
                disabled={isLoading}
              >
                Back
              </button>
              <button
                onClick={handleCliLogin}
                disabled={isLoading}
                className="flex-1 bg-accent-blue hover:bg-accent-blue/80 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            onSubmit={handleApiKeySubmit}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-text-primary mb-2">
                API Key
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api..."
                className="w-full px-4 py-2 bg-bg-primary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-green transition-colors"
                autoFocus
                disabled={isLoading}
              />
              <p className="text-xs text-text-secondary mt-2">
                Get your API key from{' '}
                <a 
                  href="https://console.anthropic.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-accent-blue hover:underline"
                >
                  console.anthropic.com
                </a>
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setAuthMethod(null)}
                className="flex-1 py-2 px-4 border border-border text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
                disabled={isLoading}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!apiKey.trim() || isLoading}
                className="flex-1 bg-accent-green hover:bg-accent-green/80 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </motion.form>
        )}
      </motion.div>
    </motion.div>
  )
}