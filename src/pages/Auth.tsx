/**
 * pages/Auth.tsx
 * ---------------
 * Login and Registration page for Rubbish Revamp.
 *
 * PHASE 2 MIGRATION:
 *   - supabase.auth.signUp()           → register() from useAuth
 *   - supabase.auth.signInWithPassword() → login() from useAuth
 *   - Google OAuth: disabled (Phase 3 — requires OAuth infrastructure)
 *   - Branding: updated to Rubbish Revamp
 */

import { useState } from 'react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import {
  Leaf,
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Store,
  ShoppingCart,
} from 'lucide-react';
import { useToastNotification } from '@/components/ToastNotification';
import type { AppRole } from '@/types/auth';

type RoleChoice = 'buyer' | 'seller';

export default function Auth() {
  const { user, loading, login, register } = useAuth();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const [isSignUp, setIsSignUp] = useState(roleParam === 'seller');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleChoice>(
    roleParam === 'seller' ? 'seller' : 'buyer'
  );
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToastNotification();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isSignUp) {
        await register({
          full_name: fullName,
          email,
          password,
          role: selectedRole,
        });
        // On successful registration, useAuth sets user and redirect happens automatically
      } else {
        await login({ email, password });
        // On successful login, useAuth sets user and redirect happens automatically
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Authentication failed';
      addToast({ type: 'error', title: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-black/5 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center px-12">
          <Link to="/" className="inline-flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="Rubbish Revamp" className="h-12 w-12 rounded-xl" />
            <span className="text-2xl font-bold text-primary-foreground">Rubbish Revamp</span>
          </Link>
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Turn Industrial Waste Into Revenue
          </h2>
          <p className="text-primary-foreground/80 text-lg">
            Join 2,500+ MSMEs already using Rubbish Revamp across Tamil Nadu.
          </p>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <img src="/logo.png" alt="Rubbish Revamp" className="h-9 w-9 rounded-xl" />
            <span className="text-lg font-bold text-foreground">Rubbish Revamp</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-muted-foreground mb-8">
            {isSignUp ? 'Connect supplier industries with scrap purchasing companies' : 'Sign in to your account'}
          </p>

          {/* Google OAuth — disabled in Phase 2 */}
          <div className="relative mb-6">
            <button
              type="button"
              disabled
              title="Google sign-in coming soon"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-border bg-secondary/50 text-sm font-medium text-muted-foreground cursor-not-allowed opacity-60"
            >
              <svg className="h-5 w-5 opacity-60" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
              <span className="ml-auto text-xs bg-secondary px-2 py-0.5 rounded-full">Coming soon</span>
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="auth-full-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="input-base pl-10"
                      required
                      minLength={2}
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Company Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('seller')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                        selectedRole === 'seller'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <Store className={`h-6 w-6 ${selectedRole === 'seller' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${selectedRole === 'seller' ? 'text-primary' : 'text-foreground'}`}>
                        Supplier Company
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Industry, factory, or generator selling scrap
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('buyer')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                        selectedRole === 'buyer'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <ShoppingCart className={`h-6 w-6 ${selectedRole === 'buyer' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${selectedRole === 'buyer' ? 'text-primary' : 'text-foreground'}`}>
                        Purchasing Company
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Recycler, processor, or foundry buying scrap
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input-base pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-base pl-10"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button
              id="auth-submit"
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {!isSignUp && (
            <p className="mt-4 text-center">
              <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary">
                Forgot your password?
              </Link>
            </p>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              id="auth-toggle"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary font-medium hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
