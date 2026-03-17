import axios from "axios";
import { getQueue, removeFromQueue, incrementRetry } from "./queue";
import { db } from "./db";
import { meterApi } from "../api/meter.api";
import { feedstockApi } from "../api/feedstock.api";
import { compostApi } from "../api/compost.api";
import { distributionApi } from "../api/distribution.api";
import { householdApi } from "../api/household.api";

const BATCH_SIZE = 10; // process 10 items at a time

export const syncQueue = async (token: string): Promise<void> => {
    const queue = await getQueue();

    if (queue.length === 0) return;

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
        const batch = queue.slice(i, i + BATCH_SIZE);
        await processBatch(batch, token);
    }


};

/**
 * Flush all cached data tables so next API calls fetch fresh from server.
 * Does NOT touch the queue — only the read-cache tables.
 */
export const flushCache = async (): Promise<void> => {
    await Promise.all([
        db.feedstock.clear(),
        db.meter.clear(),
        db.distribution.clear(),
        db.compost.clear(),
        db.households.clear(),
    ]);
};

/**
 * Proactively fetch fresh data from server into Dexie so offline mode
 * has up-to-date cache. Each API's getAll/getLastReading already handles
 * the Dexie writes internally.
 */
export const warmCache = async (): Promise<void> => {
    await Promise.allSettled([
        meterApi.getLastReading(),
        meterApi.getAll(),
        feedstockApi.getAll(),
        compostApi.getAll(),
        distributionApi.getAll(),
        householdApi.getAll(),
    ]);
};

const processBatch = async (
    batch: Awaited<ReturnType<typeof getQueue>>,
    token: string
): Promise<void> => {
    // Build FormData — items as JSON + photos as files
    const formData = new FormData();

    // Add items metadata as JSON string
    const items = batch.map(item => ({
        localId: item.localId,
        action: item.action,
        payload: item.payload,
        timestamp: new Date(item.createdAt).toISOString(),
    }));

    formData.append("items", JSON.stringify(items));

    // Add photos — fieldname is "photo_<localId>"
    for (const item of batch) {
        if (item.photoBlob && item.photoName && item.photoMime) {
            const file = new File(
                [item.photoBlob],
                item.photoName,
                { type: item.photoMime }
            );
            formData.append(`photo_${item.localId}`, file);
        }
    }

    try {
        const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/sync/batch`,
            formData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
                timeout: 30000, // 30 seconds for large batches with photos
            }
        );

        const results = response.data.data as Array<{
            localId: string;
            success: boolean;
            serverId?: string;
            error?: string;
        }>;

        // Process results — remove successes, keep failures in queue
        for (const result of results) {
            if (result.success) {
                // Remove from queue
                await removeFromQueue(result.localId);

                // Update cached item to synced: true
                await markAsSynced(result.localId, result.serverId!);
            } else {
                // Increment retry count
                await incrementRetry(result.localId, result.error || "Unknown error");
            }
        }

    } catch (err: any) {
        // Network error — entire batch failed
        // Keep all items in queue — they will retry next sync
        console.error("Batch sync failed:", err.message);
    }
};

const markAsSynced = async (
    localId: string,
    serverId: string
): Promise<void> => {
    // Update the cached record in the appropriate table
    const tables = [
        db.feedstock,
        db.meter,
        db.distribution,
        db.compost,
        db.households,
    ] as any[];

    for (const table of tables) {
        const record = await table
            .where("localId")
            .equals(localId)
            .first();

        if (record) {
            // Can't change primary key with update() — delete old, add new
            await table.delete(record.id);
            await table.put({
                ...record,
                id: serverId,
                synced: true,
            });
            break;
        }
    }
};