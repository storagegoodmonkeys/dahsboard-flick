'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_level')
        .eq('uuid', authData.user.id)
        .single();

      if (userError || !userData) {
        setError('User profile not found.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (userData.user_level !== 'admin' && userData.user_level !== 'subadmin') {
        setError('Access denied. Admin privileges required.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-[-300px] left-[-200px] w-[600px] h-[600px] rounded-full bg-gradient-red/5 blur-[120px]" />
      <div className="absolute bottom-[-300px] right-[-200px] w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-orange/3 blur-[150px]" />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo - red box tilted, yellow Flick! text spilling out */}
        <div className="flex justify-center mb-10">
          <div className="relative w-[90px] h-[90px] -rotate-[5deg]" style={{ overflow: 'visible' }}>
            <div className="absolute inset-0 rounded-[22px] bg-[#D32F2F] shadow-xl shadow-[#D32F2F]/40" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/flick-logo.png"
              alt="Flick!"
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '120px', height: 'auto', objectFit: 'contain', pointerEvents: 'none' }}
            />
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border p-8 card-shine">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@goodmonkeys.com"
                required
                className="w-full px-4 py-3 bg-input border border-input-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 bg-input border border-input-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all text-sm"
              />
            </div>

            {error && (
              <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl glow-red">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-b from-gradient-red to-gradient-orange text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-gradient-red/20 text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-8">
          Flick! by <span className="text-muted-foreground">Good Monkeys</span>
        </p>
      </div>
    </div>
  );
}
