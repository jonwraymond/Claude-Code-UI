import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'bg-primary': '#1e1e1e',
        'bg-secondary': '#252526',
        'bg-tertiary': '#2d2d30',
        'border': '#464647',
        'text-primary': '#cccccc',
        'text-secondary': '#969696',
        'text-disabled': '#6c6c6c',
        'accent-blue': '#007acc',
        'accent-green': '#4ec9b0',
        'accent-red': '#f44747',
        'accent-yellow': '#dcdcaa',
      },
    },
  },
  plugins: [],
}

export default config