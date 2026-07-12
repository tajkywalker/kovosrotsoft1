import { NavLink, useLocation } from 'react-router-dom';

export default function Sidebar({ onOpenZapis, onLogout }) {
  const location = useLocation();
  const user = localStorage.getItem('kss_user') || 'admin';

  const zaznamySub = [
    { to: '/zaznamy/prehled', label: 'Přehled' },
    { to: '/zaznamy/seznam',  label: 'Seznam'  },
    { to: '/zaznamy/overeni', label: 'Ověření' },
  ];

  const isZaznamyActive = zaznamySub.some(s => location.pathname.startsWith(s.to));

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col" style={{ backgroundColor: '#1a2332' }}>
      {/* Logo */}
      <div className="border-b border-[#2a3a50] px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚙</span>
          <div>
            <p className="text-[15px] font-bold leading-tight text-white">KovošrotSoft</p>
            <p className="text-[11px] text-slate-400">Evidence materiálu</p>
          </div>
        </div>
      </div>

      {/* Nový zápis */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={onOpenZapis}
          className="flex w-full items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-500 active:scale-95"
        >
          <span className="text-lg leading-none">＋</span>
          NOVÝ ZÁPIS
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {/* ZÁZNAMY group */}
        <div className="mb-1">
          <div
            className="flex items-center gap-2 rounded px-3 py-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: isZaznamyActive ? '#93c5fd' : '#64748b' }}
          >
            <span className="text-base">☰</span>
            ZÁZNAMY
          </div>
          <div className="ml-2 space-y-0.5">
            {zaznamySub.map(s => (
              <NavLink
                key={s.to}
                to={s.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-[#2d4a6e] text-white' : 'text-slate-300 hover:bg-[#243447] hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isActive ? '#60a5fa' : '#475569' }} />
                    {s.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        {/* PŘIDAT */}
        <NavLink
          to="/pridat"
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              isActive ? 'bg-[#2d4a6e] text-white' : 'text-slate-300 hover:bg-[#243447] hover:text-white'
            }`
          }
        >
          <span className="text-base">＋</span>
          PŘIDAT
        </NavLink>

        {/* LOG */}
        <NavLink
          to="/log"
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              isActive ? 'bg-[#2d4a6e] text-white' : 'text-slate-300 hover:bg-[#243447] hover:text-white'
            }`
          }
        >
          <span className="text-base">📋</span>
          LOG
        </NavLink>
      </nav>

      {/* User + logout */}
      <div className="border-t border-[#2a3a50] px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-300">{user}</p>
          <p className="text-[10px] text-slate-500">v1.1</p>
        </div>
        <button
          onClick={onLogout}
          className="text-[11px] text-slate-500 hover:text-red-400 transition px-1.5 py-1 rounded"
          title="Odhlásit"
        >
          ⏻
        </button>
      </div>
    </aside>
  );
}
