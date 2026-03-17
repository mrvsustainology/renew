"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api/auth.api";
import { Spinner } from "@/components/ui";
import { C } from "@/lib/utils/tokens";

const STATUS_POLL_MS = 5 * 60 * 1000; // check every 5 minutes

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoaded, loadAuth, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    loadAuth();
  }, []);

  useEffect(() => {
    if (isLoaded && !user) {
      router.replace("/login");
    }
  }, [isLoaded, user]);

  // Poll account status to detect deactivation
  const checkAccountStatus = useCallback(async () => {
    if (!user) return;
    try {
      const status = await authApi.checkStatus();

      if (status.expired) {
        // Grace period over — force logout
        await logout();
        router.replace("/login");
        return;
      }
    } catch {
      // Offline or request failed — skip silently
    }
  }, [user, logout, router]);

  useEffect(() => {
    if (!user) return;

    // Check immediately on mount
    checkAccountStatus();

    // Then poll periodically
    const interval = setInterval(checkAccountStatus, STATUS_POLL_MS);
    return () => clearInterval(interval);
  }, [user, checkAccountStatus]);

  if (!isLoaded) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: C.bg,
        }}
      >
        <Spinner />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
};
