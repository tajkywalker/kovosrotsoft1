import { useState } from 'react';
import Sidebar from './Sidebar.jsx';

export default function Layout({ children, onOpenZapis, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-56 transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0 lg:flex lg:shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          onOpenZapis={() => { onOpenZapis(); setSidebarOpen(false); }}
          onLogout={onLogout}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 bg-[#1a2332] px-4 py-3 lg:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <span className="text-white font-bold text-sm">KovošrotSoft</span>
          <button
            onClick={onOpenZapis}
            className="ml-auto flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-500 transition"
          >
            <span>＋</span> ZÁPIS
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
