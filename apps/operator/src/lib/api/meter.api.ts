import { apiClient } from "./client";
import { enqueue } from "../offline/queue";
import { db } from "../offline/db";
import { v4 as uuid } from "uuid";
import { getDigesterId } from "./session";

export const meterApi = {

    submit: async (
        formData: {
            date: string;
            reading: number;
            notes?: string;
        },
        photo: File,
        isOnline: boolean
    ) => {
        const digesterId = getDigesterId();
        const localId = uuid();

        if (isOnline) {
            const fd = new FormData();
            fd.append("photo", photo);
            fd.append("date", formData.date);
            fd.append("reading", formData.reading.toString());
            if (formData.notes) fd.append("notes", formData.notes);

            const res = await apiClient.post("/meter", fd);
            const record = res.data.data;

            await db.meter.add({
                id: record.id,
                localId,
                date: formData.date,
                reading: formData.reading,
                dailyProduction: record.dailyProduction,
                notes: formData.notes,
                photoUrl: record.photoUrl,
                synced: true,
                digesterId,
                createdAt: new Date().toISOString(),
            });

            return { ...record, synced: true, localId };

        } else {
            await enqueue("meter", formData, {
                blob: photo,
                name: photo.name,
                mime: photo.type,
            }, localId);

            // Compute dailyProduction locally from previous readings in Dexie
            let dailyProduction: number | undefined;
            try {
                const allReadings = await db.meter
                    .where("digesterId")
                    .equals(digesterId)
                    .toArray();
                allReadings.sort((a, b) => {
                    const dA = a.date?.split("T")[0] ?? a.date ?? "";
                    const dB = b.date?.split("T")[0] ?? b.date ?? "";
                    if (dB !== dA) return dB.localeCompare(dA);
                    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
                });
                const previousReading = allReadings[0];
                if (previousReading) {
                    dailyProduction = +(formData.reading - previousReading.reading).toFixed(2);
                    if (dailyProduction < 0) dailyProduction = 0;
                }
            } catch {
                /* ignore */
            }

            await db.meter.add({
                id: localId,
                localId,
                date: formData.date,
                reading: formData.reading,
                dailyProduction,
                notes: formData.notes,
                photoUrl: undefined,
                synced: false,
                digesterId,
                createdAt: new Date().toISOString(),
            });

            return { id: localId, ...formData, dailyProduction, synced: false, localId };
        }
    },

    getAll: async (from?: string, to?: string) => {
        const digesterId = getDigesterId();


        try {
            const params = new URLSearchParams();
            if (from) params.append("from", from);
            if (to) params.append("to", to);

            const res = await apiClient.get(`/meter?${params}`);
            const records = res.data.data;

            // Wipe previously synced records (keep unsynced offline entries)
            const synced = await db.meter.filter(r => r.synced === true).toArray();
            if (synced.length) await db.meter.bulkDelete(synced.map(r => r.id));

            await db.meter.bulkPut(
                records.map((r: { id: string; date: string; reading: number; dailyProduction?: number; notes?: string; photoUrl?: string; createdAt: string }) => ({
                    ...r,
                    date: r.date.split("T")[0],
                    synced: true,
                    localId: undefined,
                    digesterId,
                    createdAt: r.createdAt,
                }))
            );

            return records.map((r: { id: string }) => ({ ...r, synced: true }));

        } catch {
            const records = await db.meter
                .where("digesterId")
                .equals(digesterId)
                .reverse()
                .sortBy("date");

            return records.filter(r => {
                if (from && r.date < from) return false;
                if (to && r.date > to) return false;
                return true;
            });
        }
    },

    getLastReading: async () => {
        const digesterId = getDigesterId();

        try {
            const res = await apiClient.get("/meter/last");
            const data = res.data.data;

            // Cache the latest reading so offline has fresh data
            if (data) {
                const dateStr = typeof data.date === "string" && data.date.includes("T")
                    ? data.date.split("T")[0]
                    : data.date;
                await db.meter.put({
                    id: data.id,
                    date: dateStr,
                    reading: data.reading,
                    dailyProduction: data.dailyProduction,
                    notes: data.notes,
                    photoUrl: data.photoUrl,
                    synced: true,
                    digesterId,
                    createdAt: data.createdAt ?? new Date().toISOString(),
                });
            }

            return data;
        } catch {
            // Offline — get all records then sort by date desc, createdAt desc
            // (Dexie sortBy("createdAt") is unreliable when seed records share the same createdAt)
            const raw = await db.meter
                .where("digesterId")
                .equals(digesterId)
                .toArray();

            raw.sort((a, b) => {
                const dA = a.date?.split("T")[0] ?? a.date ?? "";
                const dB = b.date?.split("T")[0] ?? b.date ?? "";
                if (dB !== dA) return dB.localeCompare(dA);
                return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
            });

            if (!raw.length) return null;

            const latest = raw[0];
            const todayStr = new Date().toLocaleDateString("en-CA");
            const latestDateStr = latest.date?.split("T")[0] ?? latest.date;

            // Compute cumulative today's production:
            // = last reading today − last reading before today
            let dailyProduction: number | undefined = undefined;
            if (latestDateStr === todayStr) {
                const beforeToday = raw.find(
                    r => (r.date?.split("T")[0] ?? r.date) < todayStr
                );
                const todayReadings = raw.filter(
                    r => (r.date?.split("T")[0] ?? r.date) === todayStr
                );
                const firstBase = beforeToday?.reading ?? todayReadings[todayReadings.length - 1]?.reading ?? latest.reading;
                dailyProduction = +(latest.reading - firstBase).toFixed(2);
                if (dailyProduction < 0) dailyProduction = 0;
            }

            return { ...latest, date: latestDateStr, dailyProduction };
        }
    },

};