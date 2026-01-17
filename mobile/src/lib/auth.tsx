import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "../shared/schema";
import { fetchWithCookie } from "./api";

interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  class: string;
  rollNumber?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetchWithCookie("/api/auth/me");

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.log("Auth check failed (network potentially down or offline):", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
        console.log(`[Auth] Attempting login for ${username}...`);
        // We don't import BASE_URL here but fetchWithCookie handles it.
        // Let's rely on api.ts logging if we enabled it? 
        // Better: catch the error and log it.
        
        const response = await fetchWithCookie("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });

        console.log(`[Auth] Login response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Auth] Login failed. Status: ${response.status}, Body: ${errorText}`);
          let errorJson;
          try { errorJson = JSON.parse(errorText); } catch(e) {}
          throw new Error(errorJson?.message || `Login failed: ${response.status}`);
        }

        const data = await response.json();
        setUser(data.user);
    } catch (e) {
        console.error("[Auth] Login Exception:", e);
        throw e;
    }
  };

  const logout = async () => {
    try {
      await fetchWithCookie("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
