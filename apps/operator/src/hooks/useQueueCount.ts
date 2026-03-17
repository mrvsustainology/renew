"use client";

import { useState, useEffect, useCallback } from "react";
import { getQueueCount } from "@/lib/offline/queue";
import { db } from "@/lib/offline/db";

export const useQueueCount = (fastPoll = false) => {
    const [count, setCount] = useState(0);

    const refresh = useCallback(async () => {
        const n = await getQueueCount();
        setCount(n);
    }, []);

    useEffect(() => {
        refresh();

        // Poll faster (500ms) during sync, normal (3s) otherwise
        const ms = fastPoll ? 500 : 3000;
        const interval = setInterval(refresh, ms);
        return () => clearInterval(interval);
    }, [fastPoll, refresh]);

    return { count, refresh };
};