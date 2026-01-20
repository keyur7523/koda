import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Terminal, Globe, Copy, Check, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

export function LandingPage() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText('pip install git+https://github.com/keyur7523/koda.git#subdirectory=backend')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-koda-bg flex flex-col">
      {/* Header */}
      <header className="p-6 md:p-8">
        <div className="flex items-center gap-2">
          <span className="text-koda-accent text-2xl">◆</span>
          <span className="text-xl font-semibold text-koda-text">Koda</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full 
                          bg-koda-accent-light text-koda-accent text-sm font-medium mb-6">
            <Sparkles size={14} />
            AI Coding Agent
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-koda-text mb-4">
            Code faster with <span className="text-koda-accent">Koda</span>
          </h1>
          <p className="text-koda-text-muted text-lg max-w-md mx-auto">
            Your AI pair programmer that understands your codebase.
            <br />
            <span className="text-sm">Bring your own Anthropic API key.</span>
          </p>
        </motion.div>

        {/* Cards */}
        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Terminal Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-koda-surface border border-koda-border rounded-2xl p-6 
                       hover:border-koda-accent/50 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-koda-bg rounded-xl">
                <Terminal className="text-koda-accent" size={24} />
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full 
                             bg-koda-accent text-white">
                Original
              </span>
            </div>

            <h2 className="text-xl font-semibold text-koda-text mb-2">Terminal</h2>
            <p className="text-koda-text-muted text-sm mb-6">
              Best-in-class coding agent that runs in your terminal
            </p>

            {/* Code Snippet */}
            <div className="flex items-center gap-2 bg-koda-bg border border-koda-border 
                           rounded-lg p-3 font-mono text-sm">
              <code className="flex-1 text-koda-text truncate text-xs">
                <span className="text-koda-text-muted">$</span> pip install git+https://github.com/keyur7523/koda.git#subdirectory=backend
              </code>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-koda-surface-hover 
                         text-koda-text-muted hover:text-koda-accent transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check size={16} className="text-koda-accent" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
          </motion.div>

          {/* Web Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-koda-surface border border-koda-border rounded-2xl p-6 
                       hover:border-koda-accent/50 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-koda-bg rounded-xl">
                <Globe className="text-koda-accent" size={24} />
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full 
                             bg-koda-text-muted/20 text-koda-text-muted">
                Preview
              </span>
            </div>

            <h2 className="text-xl font-semibold text-koda-text mb-2">Web</h2>
            <p className="text-koda-text-muted text-sm mb-6">
              Run coding tasks seamlessly in your browser
            </p>

            {/* CTA Button */}
            <Link
              to="/auth"
              className="block w-full text-center py-3 px-4 bg-koda-accent 
                       hover:bg-koda-accent-hover text-white font-medium 
                       rounded-lg transition-colors"
            >
              Start Koda Web →
            </Link>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-koda-text-muted text-sm">
          Built for developers who ship fast
        </p>
      </footer>
    </div>
  )
}

