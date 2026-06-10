'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Search, ChevronDown, MessageCircle, BookOpen, Mail } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

const faqs = [
  { q: 'How do I connect my LinkedIn account?', a: 'Go to your Dashboard and click "Connect LinkedIn" to start the authentication process.' },
  { q: 'How does the AI content generation work?', a: 'PersonaOS analyzes your brand DNA, writing style, and goals to generate personalized content suggestions.' },
  { q: 'Can I schedule posts in advance?', a: 'Yes, use the Content Ops section to plan and schedule your content calendar.' },
  { q: 'How is my data protected?', a: 'All data is encrypted in transit and at rest. We follow industry-standard security practices.' },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white/90">Help Center</h1>
        <p className="text-sm text-white/40 mt-1">Find answers and get support.</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: BookOpen, label: 'Documentation', desc: 'Read the guides' },
          { icon: MessageCircle, label: 'Chat Support', desc: 'Talk to us' },
          { icon: Mail, label: 'Email Us', desc: 'Get a response in 24h' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard className="p-5 text-center cursor-pointer hover:border-brand-500/30 transition-all">
              <item.icon className="w-8 h-8 text-brand-400 mx-auto mb-3" />
              <h3 className="font-semibold text-white/90">{item.label}</h3>
              <p className="text-xs text-white/40 mt-1">{item.desc}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
      <GlassCard className="p-5">
        <h2 className="font-semibold text-white/90 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-white/5 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-sm text-white/80 hover:text-white/90 transition-colors"
              >
                {faq.q}
                <ChevronDown className={`w-4 h-4 transition-transform ${open === i ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-sm text-white/40">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
