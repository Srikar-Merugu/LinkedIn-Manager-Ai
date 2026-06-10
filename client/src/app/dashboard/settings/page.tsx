'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Bell, Shield, Palette, Globe, User } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/contexts/AuthContext';

const sections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'preferences', label: 'Preferences', icon: Globe },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [active, setActive] = useState('profile');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white/90">Settings</h1>
        <p className="text-sm text-white/40 mt-1">Manage your account and preferences.</p>
      </div>
      <div className="flex gap-6">
        <nav className="w-48 space-y-1 flex-shrink-0">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                active === s.id
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </nav>
        <GlassCard className="flex-1 p-6">
          <h2 className="text-lg font-semibold text-white/90 mb-4 capitalize">{active}</h2>
          <p className="text-sm text-white/40">
            {active === 'profile' && `Signed in as ${user?.email}`}
            {active === 'notifications' && 'Notification preferences coming soon.'}
            {active === 'privacy' && 'Security settings coming soon.'}
            {active === 'appearance' && 'Theme customization coming soon.'}
            {active === 'preferences' && 'Regional preferences coming soon.'}
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
