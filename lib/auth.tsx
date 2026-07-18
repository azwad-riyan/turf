"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User as PrismaUser } from "./types";
import { createClient } from "./supabase/client";

interface AuthContextType {
  user: PrismaUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, otp: string) => Promise<{ error: string | null }>;
  ownerLogin: (phone: string, password: string) => Promise<{ error: string | null }>;
  requestOTP: (phone: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({ error: null }),
  ownerLogin: async () => ({ error: null }),
  requestOTP: async () => ({ error: null }),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PrismaUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch custom user profile from our Next.js API route
        fetch('/api/auth/me')
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => setUser(data))
          .catch(() => setUser(null))
          .finally(() => setIsLoading(false));
      } else {
        setUser(null);
        setIsLoading(false);
      }
    };
    
    fetchUser();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setIsLoading(true);
          const res = await fetch('/api/auth/me');
          if (res.ok) {
            setUser(await res.json());
          }
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const login = async (phone: string, otp: string) => {
    // Supabase expects phone number with country code, e.g. +880...
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    });
    
    return { error: error?.message || null };
  };

  const requestOTP = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    return { error: error?.message || null };
  };

  const ownerLogin = async (phone: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      phone,
      password,
    });
    return { error: error?.message || null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, ownerLogin, requestOTP, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
