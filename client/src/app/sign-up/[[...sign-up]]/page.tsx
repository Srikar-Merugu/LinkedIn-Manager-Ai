import { SignUp } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.08),transparent_60%)]" />
      <div className="relative z-10">
        <SignUp
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
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
}
