"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";
import type { Profile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  /** True until the initial session lookup resolves. */
  loading: boolean;
  configured: boolean;
  signInWithGoogle: (next?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Auth state for the storefront.
 *
 * Wraps the browser Supabase client, which persists the session in cookies.
 * The middleware refreshes those cookies server-side, so `getSession()` here
 * resolves instantly on remount without a network round trip.
 *
 * Degrades gracefully when Supabase is unconfigured: the storefront still
 * browses and checks out as a guest.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  // Keep auth state in sync with Supabase for the life of the tab.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch the profile row (hosts the default shipping address) once signed in.
  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      // Clearing on sign-out responds to an external system (Supabase auth),
      // not to a render-derived value. Leaving the stale profile in place would
      // show a previous customer's address at the next checkout.
      const resetProfile = () => setProfile(null);
      resetProfile();
      return;
    }

    // The profile is created by an `auth.users` trigger, so on the very first
    // sign-in it may not exist yet — retry briefly rather than caching null.
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user!.id)
          .maybeSingle();

        if (cancelled) return;
        if (data) {
          setProfile(data as Profile);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const signInWithGoogle = useCallback(async (next = "/account") => {
    if (!isSupabaseConfigured) {
      return { error: "Google sign-in is not configured yet. Add your Supabase keys to .env.local." };
    }

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          // `offline` + `consent` yields a refresh token, letting us read the
          // customer's Google profile on every future visit without a re-prompt.
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    return error ? { error: error.message } : {};
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      loading,
      configured: isSupabaseConfigured,
      signInWithGoogle,
      signOut,
    }),
    [user, session, profile, loading, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
