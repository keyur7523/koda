import { useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface MainLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
}

export function MainLayout({ children, showSidebar = true }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-koda-bg">
      <div className="flex">
        {/* Sidebar - only visible on desktop when showSidebar is true */}
        {showSidebar && (
          <Sidebar 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
          />
        )}
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-screen md:min-w-0">
          <Header 
            onMenuClick={() => setSidebarOpen(true)} 
            showMenuButton={showSidebar}
          />
          
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

