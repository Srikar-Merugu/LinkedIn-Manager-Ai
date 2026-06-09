import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'PersonaOS - AI Personal Branding',
  description: 'Build your personal brand with AI-powered intelligence',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans`}>
        <ClerkProvider
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: '#6366f1',
              colorBackground: '#0f1019',
              colorInputBackground: '#1c1d2b',
              colorInputText: '#ecedf2',
              colorText: '#ecedf2',
              colorTextSecondary: '#8589ac',
              colorNeutral: '#434662',
              fontFamily: 'Inter, sans-serif',
              borderRadius: '0.75rem',
            },
            elements: {
              card: 'bg-surface-950 border border-surface-800 shadow-2xl',
              headerTitle: 'text-surface-100',
              headerSubtitle: 'text-surface-400',
              socialButtonsBlockButton: 'bg-surface-900 border-surface-700 hover:bg-surface-800 text-surface-200',
              formButtonPrimary: 'bg-brand-600 hover:bg-brand-500',
              formFieldInput: 'bg-surface-900 border-surface-700 text-surface-100',
              footerActionLink: 'text-brand-400 hover:text-brand-300',
              dividerLine: 'bg-surface-800',
              dividerText: 'text-surface-500',
            },
          }}
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
