import { AuthLayout } from '@/components/auth/AuthLayout';
import { SignUpForm } from '@/components/auth/SignUpForm';
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <AuthLayout
      title="Welcome to PersonaOS"
      badge="AI-Powered Growth Platform"
      footer={
        <Link
          href="/sign-in"
          className="text-sm text-white/30 hover:text-white/60 transition-colors"
        >
          Already have an account? <span className="text-brand-400 hover:text-brand-300">Sign in</span>
        </Link>
      }
    >
      <SignUpForm />
    </AuthLayout>
  );
}
