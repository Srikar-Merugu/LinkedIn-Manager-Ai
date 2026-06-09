'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BarChart3,
  Lightbulb,
  Target,
  TrendingUp,
  Sparkles,
  Settings,
  HelpCircle,
  Sparkles as LogoIcon,
  Fingerprint,
  PenTool,
  Compass,
  Layout,
  CalendarDays,
  Activity,
  MessageCircle, PenSquare,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Intelligence Report', href: '/dashboard/intelligence', icon: BarChart3 },
  { name: 'Brand Identity', href: '/dashboard/brand', icon: Fingerprint },
  { name: 'Writing DNA', href: '/dashboard/writing', icon: PenTool },
  { name: 'Career Blueprint', href: '/dashboard/career', icon: Compass },
  { name: 'Content Pillars', href: '/dashboard/content-pillars', icon: Layout },
  { name: 'Recommendations', href: '/dashboard/recommendations', icon: Lightbulb },
  { name: 'Content Strategy', href: '/dashboard/content-strategy', icon: TrendingUp },
  { name: 'Content Ops', href: '/dashboard/content-operations', icon: CalendarDays },
  { name: 'Content Studio', href: '/dashboard/content-studio', icon: PenSquare },
  { name: 'Opportunities', href: '/dashboard/opportunities', icon: Target },
  { name: 'Growth Intelligence', href: '/dashboard/growth-intelligence', icon: Activity },
  { name: 'AI Assistant', href: '/dashboard/assistant', icon: MessageCircle },
];

const secondary = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Help', href: '/dashboard/help', icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed left-0 top-0 bottom-0 w-[280px] z-40"
    >
      <div className="h-full glass rounded-r-3xl border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
              <LogoIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-surface-100">
                PersonaOS
              </h1>
              <p className="text-xs text-surface-500">Brand Intelligence</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-white/5 border border-transparent'
                )}
              >
                <item.icon className={cn('w-4 h-4', isActive && 'text-brand-400')} />
                {item.name}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-1">
          {secondary.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-surface-400 hover:text-surface-200 hover:bg-white/5 transition-all duration-200"
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          ))}
          <div className="flex items-center gap-3 px-4 py-3 mt-2 rounded-xl bg-white/[0.03]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-surface-200 truncate">{user?.fullName || 'User'}</p>
              <p className="text-[10px] text-surface-500 truncate">{user?.emailAddresses?.[0]?.emailAddress || ''}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
