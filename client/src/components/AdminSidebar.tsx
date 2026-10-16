import { useState } from 'react';

const mainLinks = [
  ['Dashboard', '/admin', '▦'],
  ['Students', '/admin/students', '♙'],
  ['Hostels', '/admin/hostels', '⌂'],
  ['Rooms', '/admin/rooms', '▤'],
] as const;

const managementLinks = [
  ['Complaints', '/admin/complaints', '⚠'],
  ['Leave Management', '/admin/leave', '◷'],
  ['Mess / Menu', '/admin/mess', '☕'],
  ['Notices', '/admin/notices', '▣'],
] as const;

const systemLinks = [
  ['Notifications', '/admin/notifications', '♢'],
  ['Reports', '/admin/reports', '▥'],
  ['Profile', '/admin/profile', '♙'],
] as const;

export function AdminSidebar({
  currentPath,
  onNavigate,
}: {
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  function handleNavigate(path: string) {
    onNavigate(path);
    setIsOpen(false);
  }

  return (
    <>
      <button
        aria-label="Open admin menu"
        className="fixed left-4 top-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-slate-800 lg:hidden"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Menu
      </button>

      {isOpen && (
        <button
          aria-label="Close admin menu"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
          type="button"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 text-white shadow-2xl transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-slate-800 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-950">
            H
          </div>

          <div className="ml-3">
            <p className="text-lg font-bold tracking-tight">
              HostelOS
            </p>

            <p className="text-xs text-slate-400">
              Administration
            </p>
          </div>

          <button
            aria-label="Close admin menu"
            className="ml-auto rounded-md px-2 py-1 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <SidebarGroup
            title="Main"
            links={mainLinks}
            currentPath={currentPath}
            onNavigate={handleNavigate}
          />

          <SidebarGroup
            title="Management"
            links={managementLinks}
            currentPath={currentPath}
            onNavigate={handleNavigate}
          />

          <SidebarGroup
            title="System"
            links={systemLinks}
            currentPath={currentPath}
            onNavigate={handleNavigate}
          />
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-4">
          <div className="rounded-lg bg-slate-900 px-3 py-3">
            <p className="text-xs font-medium text-slate-300">
              UET Hostel Management
            </p>

            <p className="mt-1 text-[11px] text-slate-500">
              Administrator Panel
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

function SidebarGroup({
  title,
  links,
  currentPath,
  onNavigate,
}: {
  title: string;
  links: readonly (readonly [string, string, string])[];
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="mb-7">
      <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </p>

      <div className="space-y-1">
        {links.map(([label, path, icon]) => {
          const isActive = currentPath === path;

          return (
            <button
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              key={path}
              onClick={() => onNavigate(path)}
              type="button"
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-slate-950" />
              )}

              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base transition ${
                  isActive
                    ? 'bg-slate-100 text-slate-950'
                    : 'bg-slate-900 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'
                }`}
              >
                {icon}
              </span>

              <span className="flex-1">
                {label}
              </span>

              {isActive && (
                <span className="text-xs font-bold text-slate-400">
                  →
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}