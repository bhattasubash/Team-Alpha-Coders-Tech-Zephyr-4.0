'use client';

import React from 'react';
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
  NavKit,
  SignOutIcon,
} from '@/components/ui/Icons';
import { Chip } from '@/components/ui/Chip';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles?: string[];
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: NavDashboard },
  { label: 'Timetable', href: '/timetable', icon: NavTimetable },
  { label: 'Exams', href: '/exams', icon: NavExams, roles: ['admin', 'department_coordinator', 'faculty'] },
  { label: 'Bookings', href: '/bookings', icon: NavBookings },
  { label: 'Disruption', href: '/disruption', icon: NavDisruption, roles: ['admin', 'department_coordinator'] },
  { label: 'Rooms', href: '/rooms', icon: NavRooms },
  { label: 'Proof', href: '/admin/proof', icon: NavProof, roles: ['admin'] },
  { label: 'Priority', href: '/admin/priority', icon: NavPriority, roles: ['admin'] },
  { label: 'Why Here', href: '/why-here', icon: NavProof },
  { label: 'Design Kit', href: '/kit', icon: NavKit },
];

export function Rail() {
  const pathname = usePathname();
  const { role, user } = useApp();

  const allowedItems = ALL_NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden sm:flex flex-col flex-shrink-0 w-16 lg:w-[232px] h-screen sticky top-0 bg-rail text-[#E8E6DD] border-r border-[#1C3739] z-30 select-none">
        {/* Brand / Logo */}
        <div className="h-14 flex items-center px-4 lg:px-5 border-b border-[#1C3739]">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="p-1 rounded bg-[#1C3739] text-[#EDEBE0] group-hover:text-event transition-colors">
              <CITLogo size={20} />
            </div>
            <span className="hidden lg:inline font-serif text-[20px] text-[#EDEBE0] tracking-tight">
              CIT Scheduler
            </span>
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-4 px-2 lg:px-3 space-y-1 overflow-y-auto">
          {allowedItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            const IconComponent = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-card text-[13px] font-medium font-ui transition-colors relative ${
                  isActive
                    ? 'text-[#EDEBE0]'
                    : 'text-[#EDEBE0]/70 hover:text-[#EDEBE0] hover:bg-[#1C3739]/50'
                }`}
                title={item.label}
              >
                <IconComponent size={18} className="flex-shrink-0" />
                <span className="hidden lg:inline relative">
                  {item.label}
                  {/* Underline for active state: 2px Violet underline under text */}
                  {isActive && (
                    <span className="absolute left-0 right-0 -bottom-1 h-[2px] bg-violet rounded-full" />
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Sign out at Bottom */}
        <div className="p-3 lg:p-4 border-t border-[#1C3739] bg-[#0E1F21]/40">
          <div className="hidden lg:flex flex-col gap-1.5 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#EDEBE0] truncate max-w-[140px]">
                {user.name}
              </span>
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider bg-[#1C3739] text-[#9DB0AE] rounded-cell">
                {role === 'department_coordinator' ? 'Coord' : role}
              </span>
            </div>
            <span className="text-[11px] text-[#9DB0AE] truncate">{user.email}</span>
          </div>

          <Link
            href="/login"
            className="flex items-center justify-center lg:justify-start gap-2 text-[12px] text-[#9DB0AE] hover:text-[#EDEBE0] py-1 transition-colors"
            title="Sign out"
          >
            <SignOutIcon size={16} />
            <span className="hidden lg:inline">Sign out</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Bottom Bar (<640px) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 h-14 bg-rail text-[#E8E6DD] border-t border-[#1C3739] flex items-center justify-around z-40 px-2">
        {ALL_NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = pathname === item.href;
          const IconComponent = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center p-1 relative text-[10px] ${
                isActive ? 'text-[#EDEBE0]' : 'text-[#EDEBE0]/60'
              }`}
            >
              <IconComponent size={20} />
              <span className="mt-0.5">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-[2px] bg-violet rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}
