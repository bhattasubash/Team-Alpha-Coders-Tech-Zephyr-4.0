'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  CITLogo,
  NavDashboard,
  NavTimetable,
  NavExams,
  NavBookings,
  NavDisruption,
  NavRooms,
  NavProof,
  NavPriority,
  NavAdmin,
  SignOutIcon,
  SidebarCollapseIcon,
  SidebarExpandIcon,
  ChevronDown,
  ChevronRight,
} from '@/components/ui/Icons';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles?: string[];
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: NavDashboard },
  { label: 'Timetable', href: '/timetable', icon: NavTimetable },
  { label: 'Exams', href: '/exams', icon: NavExams, roles: ['admin', 'department_coordinator', 'faculty'] },
  { label: 'Bookings', href: '/bookings', icon: NavBookings },
  { label: 'Disruption', href: '/disruption', icon: NavDisruption, roles: ['admin', 'department_coordinator'] },
  { label: 'Rooms', href: '/rooms', icon: NavRooms },
];

const ADMIN_SUB_ITEMS: NavItem[] = [
  { label: 'Proof', href: '/admin/proof', icon: NavProof },
  { label: 'Priority', href: '/admin/priority', icon: NavPriority },
];

export function Rail() {
  const pathname = usePathname();
  const { role, user, isSidebarCollapsed, toggleSidebar } = useApp();
  const [isAdminOpen, setIsAdminOpen] = useState(true);
  const [showAdminFlyout, setShowAdminFlyout] = useState(false);

  // Keep admin group open if active on an admin route
  useEffect(() => {
    if (pathname?.startsWith('/admin')) {
      setIsAdminOpen(true);
    }
  }, [pathname]);

  const allowedPrimaryItems = PRIMARY_NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  const isAdminRole = role === 'admin';
  const isAdminActive = pathname?.startsWith('/admin');

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside
        className={`hidden sm:flex flex-col flex-shrink-0 h-screen sticky top-0 bg-rail text-[#E8E6DD] border-r border-[#1C3739] z-30 select-none transition-all duration-200 ${
          isSidebarCollapsed ? 'w-16' : 'w-16 lg:w-[232px]'
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-14 flex items-center px-4 lg:px-5 border-b border-[#1C3739] justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 group overflow-hidden">
            <div className="p-1.5 rounded-[6px] bg-[#1C3739] text-[#EDEBE0] group-hover:text-violet group-hover:shadow-[0_0_12px_rgba(125,93,255,0.4)] transition-all">
              <CITLogo size={20} />
            </div>
            {!isSidebarCollapsed && (
              <span className="hidden lg:inline font-serif text-[20px] text-[#EDEBE0] tracking-tight whitespace-nowrap">
                CIT Scheduler
              </span>
            )}
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-4 px-2 lg:px-3 space-y-1 overflow-y-auto">
          {allowedPrimaryItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            const IconComponent = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-card text-[13px] font-medium font-ui transition-all relative group ${
                  isActive
                    ? 'text-white bg-violet/20 border border-violet/30 shadow-[0_0_14px_rgba(125,93,255,0.25)]'
                    : 'text-[#EDEBE0]/70 hover:text-[#EDEBE0] hover:bg-[#1C3739]/60'
                } ${isSidebarCollapsed ? 'justify-center lg:justify-center' : ''}`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <IconComponent
                  size={18}
                  className={`flex-shrink-0 ${isActive ? 'text-violet' : 'text-[#EDEBE0]/80'}`}
                />
                {!isSidebarCollapsed && (
                  <span className="hidden lg:inline relative truncate">
                    {item.label}
                    {isActive && (
                      <span className="absolute left-0 right-0 -bottom-1 h-[2px] bg-violet rounded-full shadow-[0_0_8px_rgba(125,93,255,0.8)]" />
                    )}
                  </span>
                )}
                {/* Tooltip for collapsed mode */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#12292B] border border-[#2B4547] rounded shadow-lg text-[12px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}

          {/* Consolidated Admin Group (Proof + Priority) */}
          {isAdminRole && (
            <div className="pt-2 relative">
              {isSidebarCollapsed ? (
                // Collapsed icon with flyout
                <div
                  className="relative group"
                  onMouseEnter={() => setShowAdminFlyout(true)}
                  onMouseLeave={() => setShowAdminFlyout(false)}
                >
                  <button
                    onClick={() => setShowAdminFlyout((prev) => !prev)}
                    className={`w-full flex items-center justify-center p-2 rounded-card text-[13px] font-medium transition-all ${
                      isAdminActive
                        ? 'text-white bg-violet/20 border border-violet/30 shadow-[0_0_14px_rgba(125,93,255,0.25)]'
                        : 'text-[#EDEBE0]/70 hover:text-[#EDEBE0] hover:bg-[#1C3739]/60'
                    }`}
                    title="Admin (Proof & Priority)"
                  >
                    <NavAdmin size={18} className={isAdminActive ? 'text-violet' : 'text-[#EDEBE0]/80'} />
                  </button>

                  {/* Flyout menu when collapsed */}
                  {showAdminFlyout && (
                    <div className="absolute left-full top-0 ml-2 w-36 bg-[#12292B] border border-[#2B4547] rounded-card shadow-xl p-1 z-50">
                      <div className="px-2 py-1 text-[10px] uppercase font-bold text-[#9DB0AE] tracking-wider border-b border-[#1C3739] mb-1">
                        Admin Tools
                      </div>
                      {ADMIN_SUB_ITEMS.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded text-[12px] transition-colors ${
                              isSubActive
                                ? 'bg-violet/25 text-white font-medium'
                                : 'text-[#EDEBE0]/80 hover:bg-[#1C3739] hover:text-white'
                            }`}
                          >
                            <SubIcon size={14} className={isSubActive ? 'text-violet' : ''} />
                            <span>{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                // Expanded accordion
                <div className="hidden lg:block">
                  <button
                    onClick={() => setIsAdminOpen((prev) => !prev)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-card text-[13px] font-medium font-ui transition-all ${
                      isAdminActive
                        ? 'text-white bg-[#1C3739]/80 font-semibold'
                        : 'text-[#EDEBE0]/70 hover:text-[#EDEBE0] hover:bg-[#1C3739]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <NavAdmin size={18} className={isAdminActive ? 'text-violet' : 'text-[#EDEBE0]/80'} />
                      <span>Admin</span>
                    </div>
                    {isAdminOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  {isAdminOpen && (
                    <div className="ml-5 mt-1 pl-3 border-l border-[#1C3739] space-y-1">
                      {ADMIN_SUB_ITEMS.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-card text-[12.5px] transition-all ${
                              isSubActive
                                ? 'text-white bg-violet/20 border border-violet/30 font-medium shadow-[0_0_10px_rgba(125,93,255,0.2)]'
                                : 'text-[#EDEBE0]/70 hover:text-[#EDEBE0] hover:bg-[#1C3739]/40'
                            }`}
                          >
                            <SubIcon size={15} className={isSubActive ? 'text-violet' : 'text-[#EDEBE0]/70'} />
                            <span>{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Sidebar Collapse/Expand Toggle Button */}
        <div className="px-2 lg:px-3 py-2 border-t border-[#1C3739]/80">
          <button
            onClick={toggleSidebar}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-card text-[12px] font-medium text-[#9DB0AE] hover:text-[#EDEBE0] hover:bg-[#1C3739]/60 transition-all ${
              isSidebarCollapsed ? 'justify-center lg:justify-center' : ''
            }`}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <SidebarExpandIcon size={18} className="text-[#9DB0AE]" />
            ) : (
              <>
                <SidebarCollapseIcon size={18} className="text-[#9DB0AE]" />
                <span className="hidden lg:inline text-[12px]">Collapse sidebar</span>
              </>
            )}
          </button>
        </div>

        {/* User Card & Sign out at Bottom */}
        <div className="p-3 lg:p-4 border-t border-[#1C3739] bg-[#0E1F21]/60">
          {!isSidebarCollapsed ? (
            <div className="hidden lg:flex flex-col gap-1.5 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#EDEBE0] truncate max-w-[130px]">
                  {user.name}
                </span>
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-violet/20 border border-violet/30 text-violet rounded-cell">
                  {role === 'department_coordinator' ? 'Coord' : role}
                </span>
              </div>
              <span className="text-[11px] text-[#9DB0AE] truncate">{user.email}</span>
            </div>
          ) : (
            <div className="flex justify-center mb-2" title={`${user.name} (${role})`}>
              <div className="w-8 h-8 rounded-full bg-violet/20 border border-violet/40 text-violet flex items-center justify-center font-bold text-[12px]">
                {user.name.slice(0, 1)}
              </div>
            </div>
          )}

          <Link
            href="/login"
            className={`flex items-center gap-2 text-[12px] text-[#9DB0AE] hover:text-[#EDEBE0] py-1 transition-colors ${
              isSidebarCollapsed ? 'justify-center lg:justify-center' : 'justify-center lg:justify-start'
            }`}
            title="Sign out"
          >
            <SignOutIcon size={16} />
            {!isSidebarCollapsed && <span className="hidden lg:inline">Sign out</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile Bottom Bar (<640px) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 h-14 bg-rail/95 backdrop-blur-md text-[#E8E6DD] border-t border-[#1C3739] flex items-center justify-around z-40 px-2">
        {allowedPrimaryItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href;
          const IconComponent = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center p-1 relative text-[10px] transition-colors ${
                isActive ? 'text-violet font-semibold' : 'text-[#EDEBE0]/60'
              }`}
            >
              <IconComponent size={20} className={isActive ? 'text-violet' : ''} />
              <span className="mt-0.5">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-[2px] bg-violet rounded-full shadow-[0_0_8px_rgba(125,93,255,0.8)]" />
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}
