import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'ZÁZNAMY', sub: [
    { to: '/zaznamy/prehled', label: 'Přehled' },
    { to: '/zaznamy/seznam',  label: 'Seznam'  },
    { to: '/zaznamy/overeni', label: 'Ověření' },
  ]},
  { to: '/pridat', label: 'PŘIDAT' },
];

export default function Sidebar({ onOpenZapis }) {
  const location = useLocation();

  return (
    <aside
      className="flex h-screen w-56 shrink-0 flex-col"
      style={{ backgroundColor: '#1a2332' }}
    >
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

      {/* ZÁPIS button */}
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
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {navItems.map((item) => {
          if (item.sub) {
            const isActive = item.sub.some(s => location.pathname.startsWith(s.to));
            return (
              <div key={item.label} className="mb-1">
                <div
                  className="flex items-center gap-2 rounded px-3 py-2 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: isActive ? '#93c5fd' : '#64748b' }}
                >
                  <span className="text-base">☰</span>
                  {item.label}
                </div>
                <div className="ml-2 space-y-0.5">
                  {item.sub.map(s => (
                    <NavLink
                      key={s.to}
                      to={s.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[#2d4a6e] text-white'
                            : 'text-slate-300 hover:bg-[#243447] hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: isActive ? '#60a5fa' : '#475569' }}
                          />
                          {s.label}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#2d4a6e] text-white'
                    : 'text-slate-300 hover:bg-[#243447] hover:text-white'
                }`
              }
            >
              <span className="text-base">＋</span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#2a3a50] px-4 py-3">
        <p className="text-[11px] text-slate-500">v1.0 · KovošrotSoft</p>
      </div>
    </aside>
  );
}
