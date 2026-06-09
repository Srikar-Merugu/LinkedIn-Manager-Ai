'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useSignIn, useSignUp } from '@clerk/nextjs/legacy';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
  onboardingStatus?: string;
  subscriptionPlan?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithOAuth: (strategy: 'oauth_linkedin' | 'oauth_google' | 'oauth_github') => Promise<void>;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string, fullName: string) => Promise<void>;
  loginWithEmailOTP: (email: string) => Promise<void>;
  verifyEmailOTP: (email: string, code: string) => Promise<void>;
  loginWithMagicLink: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  openEmailAuth: () => void;
  showEmailAuth: boolean;
  setShowEmailAuth: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { signOut } = useClerk();
  const router = useRouter();
  const [mappedUser, setMappedUser] = useState<User | null>(null);
  const [showEmailAuth, setShowEmailAuth] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && clerkUser) {
      setMappedUser({
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
        avatar: clerkUser.imageUrl || undefined,
        onboardingStatus: (clerkUser.publicMetadata as any)?.onboardingStatus,
        subscriptionPlan: (clerkUser.publicMetadata as any)?.subscriptionPlan,
      });
    } else if (isLoaded && !isSignedIn) {
      setMappedUser(null);
    }
  }, [clerkUser, isLoaded, isSignedIn]);

  const loginWithOAuth = useCallback(async (strategy: 'oauth_linkedin' | 'oauth_google' | 'oauth_github') => {
    if (!signIn) return;
    await signIn.authenticateWithRedirect({
      strategy,
      redirectUrl: '/sso-callback',
      redirectUrlComplete: '/sign-in?success=true',
    });
  }, [signIn]);

  const loginWithEmailPassword = useCallback(async (email: string, password: string) => {
    if (!signIn) throw new Error('Sign in not initialized');
    const result = await signIn.create({
      identifier: email,
      password,
      strategy: 'password',
    });
    if (result.status === 'complete') {
      await (signIn as any).setActive?.({ session: result.createdSessionId });
      router.push('/sign-in?success=true');
    }
  }, [signIn, router]);

  const signUpWithEmailPassword = useCallback(async (email: string, password: string, fullName: string) => {
    if (!signUp) throw new Error('Sign up not initialized');
    const result = await signUp.create({
      emailAddress: email,
      password,
      firstName: fullName.split(' ')[0] || '',
      lastName: fullName.split(' ').slice(1).join(' ') || '',
    });
    if (result.status === 'complete') {
      await (signUp as any).setActive?.({ session: result.createdSessionId });
      router.push('/sign-in?success=true');
    } else if (result.status === 'missing_requirements') {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      throw new Error('VERIFY_EMAIL');
    }
  }, [signUp, router]);

  const loginWithEmailOTP = useCallback(async (email: string) => {
    if (!signIn) throw new Error('Sign in not initialized');
    await signIn.create({
      identifier: email,
      strategy: 'email_code',
    });
  }, [signIn]);

  const verifyEmailOTP = useCallback(async (email: string, code: string) => {
    if (!signIn) throw new Error('Sign in not initialized');
    const result = await signIn.attemptFirstFactor({
      strategy: 'email_code',
      code,
    });
    if (result.status === 'complete') {
      await (signIn as any).setActive?.({ session: result.createdSessionId });
      router.push('/sso-callback');
    }
  }, [signIn, router]);

  const loginWithMagicLink = useCallback(async (email: string) => {
    if (!signIn) throw new Error('Sign in not initialized');
    await signIn.create({
      identifier: email,
      strategy: 'email_link',
      redirectUrl: `${window.location.origin}/sso-callback`,
    });
  }, [signIn]);

  const logout = useCallback(async () => {
    await signOut();
    setMappedUser(null);
    router.push('/');
  }, [signOut, router]);

  const refreshUser = useCallback(async () => {
    if (clerkUser) {
      await clerkUser.reload();
    }
  }, [clerkUser]);

  const openEmailAuth = useCallback(() => {
    setShowEmailAuth(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: mappedUser,
        isLoading: !isLoaded,
        isAuthenticated: !!isSignedIn,
        loginWithOAuth,
        loginWithEmailPassword,
        signUpWithEmailPassword,
        loginWithEmailOTP,
        verifyEmailOTP,
        loginWithMagicLink,
        logout,
        refreshUser,
        openEmailAuth,
        showEmailAuth,
        setShowEmailAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
