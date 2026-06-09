import { AuthLayout } from '@/components/auth/AuthLayout';
import { SignInForm } from '@/components/auth/SignInForm';
import Link from 'next/link';

export default function SignInPage() {
  return (
    <AuthLayout
      title="Welcome Back"
      badge="AI-Powered Growth Platform"
      footer={
        <Link
          href="/sign-up"
          className="text-sm text-white/30 hover:text-white/60 transition-colors"
        >
          Don&apos;t have an account? <span className="text-brand-400 hover:text-brand-300">Sign up</span>
        </Link>
      }
    >
      <SignInForm />
    </AuthLayout>
  );
}
