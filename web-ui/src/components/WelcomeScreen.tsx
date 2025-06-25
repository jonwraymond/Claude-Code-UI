import { motion } from 'framer-motion'
import { CodeBracketIcon, DocumentTextIcon, LightBulbIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline'

const quickActions = [
  {
    icon: CodeBracketIcon,
    title: 'Explain Code',
    prompt: 'Explain this code',
  },
  {
    icon: LightBulbIcon,
    title: 'Debug Issue',
    prompt: 'Help me debug this issue',
  },
  {
    icon: DocumentTextIcon,
    title: 'Write Documentation',
    prompt: 'Write documentation for',
  },
  {
    icon: WrenchScrewdriverIcon,
    title: 'Refactor Code',
    prompt: 'Help me refactor this code',
  },
]

export default function WelcomeScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-center h-full text-center px-8"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mb-8"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-accent-blue to-accent-green rounded-2xl flex items-center justify-center mb-6">
          <CodeBracketIcon className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-text-primary mb-4">
          Welcome to Claude Code
        </h2>
        <p className="text-text-secondary text-lg max-w-md">
          Connected to your Claude CLI. Start a conversation or try one of the quick actions below.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="grid grid-cols-2 gap-4 w-full max-w-md"
      >
        {quickActions.map((action, index) => (
          <motion.button
            key={action.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-4 bg-bg-secondary border border-border rounded-xl hover:border-accent-blue/50 transition-all group"
            onClick={() => {
              // This will be handled by parent component
              const event = new CustomEvent('quickAction', { detail: action.prompt })
              window.dispatchEvent(event)
            }}
          >
            <action.icon className="w-6 h-6 text-accent-blue mb-2 mx-auto group-hover:text-accent-green transition-colors" />
            <span className="text-sm font-medium text-text-primary">{action.title}</span>
          </motion.button>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="mt-8 text-sm text-text-secondary"
      >
        <p>Press <kbd className="px-2 py-1 bg-bg-tertiary rounded text-xs">⌘ + Enter</kbd> to send, <kbd className="px-2 py-1 bg-bg-tertiary rounded text-xs">Shift + Enter</kbd> for new line</p>
      </motion.div>
    </motion.div>
  )
}