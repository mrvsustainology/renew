"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { syncQueue, warmCache } from "@/lib/offline/sync";
import { useAuthStore } from "@/store/authStore";

export const useOnlineStatus = () => {
    const [isOnline, setIsOnline] = useState(true); // SSR-safe default; corrected on mount
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSynced, setLastSynced] = useState<Date | null>(null);
    const { token } = useAuthStore();
    const isSyncingRef = useRef(false);

    const triggerSync = useCallback(async () => {
        if (!token || isSyncingRef.current) return;
        isSyncingRef.current = true;
        setIsSyncing(true);
        try {
            await syncQueue(token);
            await warmCache();
            setLastSynced(new Date());
        } catch (err) {
            console.error("Sync failed:", err);
        } finally {
            isSyncingRef.current = false;
            setIsSyncing(false);
        }
    }, [token]);

    useEffect(() => {
        // Correct the initial state immediately — navigator.onLine reflects
        // the real status on mount. The online/offline events only fire on
        // *changes*, so if the device was already offline before mount we'd
        // never receive the event and isOnline would stay stuck at true.
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            triggerSync();
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        if (navigator.onLine) {
            triggerSync();
        }

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [triggerSync]);

    return { isOnline, isSyncing, lastSynced, triggerSync };
};
