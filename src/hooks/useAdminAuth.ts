import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

/** Fail-safe timeout for role queries — prevents indefinite spinner. */
const ROLE_QUERY_TIMEOUT_MS = 10_000;

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Track latest userId to discard stale responses
  const latestUserIdRef = useRef<string | null>(null);

  // ── Role check with timeout ──────────────────────────────────

  const checkAdminRole = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const result = await Promise.race([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Role query timed out')), ROLE_QUERY_TIMEOUT_MS),
        ),
      ]);

      if (result && 'error' in result && result.error) {
        console.error('[useAdminAuth] Role check DB error:', result.error);
        return false;
      }

      return !!(result && 'data' in result && result.data);
    } catch (err) {
      console.error('[useAdminAuth] Role check failed:', err);
      return false;
    }
  }, []);

  // ── Effect 1: subscribe to auth state changes — sync only ────

  useEffect(() => {
    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Sync update only — no async work inside the callback.
      // The role lookup is driven by user?.id in Effect 2 below.
      if (cancelled) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (!newSession?.user) {
        // No user → definitely not admin, loading can settle now
        setIsAdmin(false);
        setIsLoading(false);
      }
      // If there IS a user, leave isLoading=true until Effect 2 settles it
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []); // intentionally empty — runs once on mount

  // ── Effect 2: role lookup driven by user.id ──────────────────

  useEffect(() => {
    // Ignore the very first render — Effect 1 may not have set user yet.
    // But we need to handle the case where user arrives after initial mount.
    if (!user) return; // Effect 1 already set isLoading=false for no-user case

    let cancelled = false;
    const userId = user.id;
    latestUserIdRef.current = userId;

    // We're about to check role — ensure loading is true while we wait
    setIsLoading(true);

    checkAdminRole(userId).then((admin) => {
      if (cancelled || latestUserIdRef.current !== userId) return;
      setIsAdmin(admin);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user, checkAdminRole]);

  // ── Auth actions ─────────────────────────────────────────────

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  return {
    user,
    session,
    isLoading,
    isAdmin,
    signIn,
    signUp,
    signOut,
  };
}
