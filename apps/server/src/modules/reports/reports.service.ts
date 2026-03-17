import { prisma } from "../../config/database";
import { localDayStart, localDayEnd } from "../../utils/localDate";

// Normalize a Date to YYYY-MM-DD string using local timezone
const toDateStr = (d: Date | string): string => {
    const dt = typeof d === "string" ? new Date(d) : d;
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

const getLast14Days = () => {
    const days: string[] = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(toDateStr(d));
    }
    return days;
};

export const reportsService = {

    getOverview: async () => {
        const [
            digesters,
            operators,
            householdCount,
            feedstockAgg,
            compostAgg,
            meterReadings,
            distributions,
            households,
        ] = await Promise.all([
            prisma.digester.findMany({
                include: {
                    user: { select: { id: true, name: true } },
                    _count: { select: { households: true } },
                },
                orderBy: { createdAt: "asc" },
            }),
            prisma.user.count({ where: { role: "operator" } }),
            prisma.household.count(),
            prisma.feedstockLog.aggregate({ _sum: { weight: true }, _count: true }),
            prisma.compostLog.aggregate({ _sum: { bags: true } }),
            prisma.flowMeterReading.findMany({
                orderBy: [{ digesterId: "asc" }, { date: "asc" }],
                select: { id: true, digesterId: true, date: true, reading: true, operatorId: true },
            }),
            prisma.gasDistribution.aggregate({ _sum: { volume: true } }),
            prisma.household.findMany({
                select: { id: true, fuelReplaced: true },
            }),
        ]);

        // Calculate total gas produced per digester (last - first meter reading)
        const gasPerDigester: Record<string, number> = {};
        const metersByDigester = meterReadings.reduce((acc, r) => {
            if (!acc[r.digesterId]) acc[r.digesterId] = [];
            acc[r.digesterId].push(r);
            return acc;
        }, {} as Record<string, typeof meterReadings>);

        // Build digesterId → location map
        const locationMap: Record<string, string> = {};
        for (const d of digesters) locationMap[d.id] = d.location;

        let totalGasProduced = 0;
        let anomalyCount = 0;
        const anomalyReadings: Array<{
            id: string; digesterId: string; location: string;
            date: string; reading: number; delta: number; operatorId: string | null;
        }> = [];

        for (const [digesterId, readings] of Object.entries(metersByDigester)) {
            if (readings.length >= 2) {
                const produced = +(readings[readings.length - 1].reading - readings[0].reading).toFixed(2);
                gasPerDigester[digesterId] = produced;
                totalGasProduced += produced;
                for (let i = 1; i < readings.length; i++) {
                    const delta = +(readings[i].reading - readings[i - 1].reading).toFixed(2);
                    if (delta >= 0 && delta < 5) {
                        anomalyCount++;
                        anomalyReadings.push({
                            id: readings[i].id,
                            digesterId,
                            location: locationMap[digesterId] ?? "",
                            date: toDateStr(readings[i].date),
                            reading: readings[i].reading,
                            delta,
                            operatorId: readings[i].operatorId,
                        });
                    }
                }
            } else {
                gasPerDigester[digesterId] = 0;
            }
        }

        // Fuel displacement
        const fuelCount: Record<string, number> = {};
        for (const hh of households) {
            for (const fuel of hh.fuelReplaced) {
                fuelCount[fuel] = (fuelCount[fuel] ?? 0) + 1;
            }
        }

        const totalDistributed = +(distributions._sum.volume ?? 0).toFixed(2);

        return {
            stats: {
                digesterCount: digesters.length,
                operatorCount: operators,
                householdCount,
                totalGasProduced: +totalGasProduced.toFixed(1),
                totalFeedstockKg: +(feedstockAgg._sum.weight ?? 0).toFixed(1),
                totalCompostBags: compostAgg._sum.bags ?? 0,
                totalDistributed,
                surplus: +(totalGasProduced - totalDistributed).toFixed(2),
                anomalyCount,
                unassignedDigesters: digesters.filter(d => !d.user).length,
            },
            digesters: digesters.map(d => ({
                id: d.id,
                location: d.location,
                status: d.status,
                operatorId: d.user?.id ?? null,
                operatorName: d.user?.name ?? null,
                householdCount: d._count.households,
                gasProduced: gasPerDigester[d.id] ?? 0,
            })),
            fuelDisplacement: fuelCount,
            anomalyReadings,
        };
    },

    getCharts: async () => {
        const last14 = getLast14Days();
        const windowStart = localDayStart(last14[0]);
        const windowEnd = localDayEnd(last14[last14.length - 1]);

        const [feedstockLogs, meterReadings, allDistributions, compostLogs, allCompost, digesters] =
            await Promise.all([
                prisma.feedstockLog.findMany({
                    where: { date: { gte: windowStart, lte: windowEnd } },
                    select: { date: true, weight: true, type: true, digesterId: true },
                }),
                // Fetch ALL meter readings (needed to compute accurate per-digester deltas)
                prisma.flowMeterReading.findMany({
                    orderBy: [{ digesterId: "asc" }, { date: "asc" }],
                    select: { id: true, digesterId: true, date: true, reading: true },
                }),
                // All-time distributions for gas balance chart
                prisma.gasDistribution.findMany({
                    select: { date: true, volume: true, digesterId: true },
                }),
                prisma.compostLog.findMany({
                    where: { date: { gte: windowStart, lte: windowEnd } },
                    select: { date: true, bags: true, digesterId: true },
                }),
                // All-time compost for compost-by-digester chart
                prisma.compostLog.findMany({
                    select: { digesterId: true, bags: true },
                }),
                prisma.digester.findMany({ select: { id: true } }),
            ]);

        // Gas production trend (last 14 days) — derive daily deltas per digester.
        // For each digester: use the last pre-window reading as baseline so the
        // first in-window delta doesn't carry months of accumulated production.
        const metersByDigester: Record<string, Array<{ date: string; reading: number }>> = {};
        for (const r of meterReadings) {
            const dateStr = toDateStr(r.date);
            if (!metersByDigester[r.digesterId]) metersByDigester[r.digesterId] = [];
            metersByDigester[r.digesterId].push({ date: dateStr, reading: r.reading });
        }

        const windowStartStr = last14[0];

        // Daily gas by date (sum across all digesters)
        const dailyGas: Record<string, number> = {};
        for (const readings of Object.values(metersByDigester)) {
            // Split into pre-window baseline and in-window readings
            let baseline: { date: string; reading: number } | null = null;
            const inWindow: Array<{ date: string; reading: number }> = [];
            for (const r of readings) {
                if (r.date < windowStartStr) {
                    baseline = r; // keep most recent pre-window reading
                } else {
                    inWindow.push(r);
                }
            }
            // Compute deltas only within the window
            let prev = baseline;
            for (const r of inWindow) {
                if (prev !== null) {
                    const delta = +(r.reading - prev.reading).toFixed(2);
                    if (delta >= 0) {
                        dailyGas[r.date] = (dailyGas[r.date] ?? 0) + delta;
                    }
                }
                prev = r;
            }
        }

        const gasTrend = last14.map(d => ({
            date: d.slice(5), // MM-DD
            volume: +(dailyGas[d] ?? 0).toFixed(1),
        }));

        // Feedstock trend
        const fsTrend = last14.map(d => ({
            date: d.slice(5),
            kg: +feedstockLogs
                .filter(r => toDateStr(r.date) === d)
                .reduce((s, r) => s + r.weight, 0)
                .toFixed(0),
        }));

        // Feedstock by type (all time)
        const allFeedstock = await prisma.feedstockLog.findMany({
            select: { type: true, weight: true },
        });
        const fsByType: Record<string, number> = {};
        for (const r of allFeedstock) {
            fsByType[r.type] = (fsByType[r.type] ?? 0) + r.weight;
        }
        const feedstockByType = Object.entries(fsByType).map(([name, value]) => ({
            name,
            value: +value.toFixed(1),
        }));

        // Compost trend
        const compostTrend = last14.map(d => ({
            date: d.slice(5),
            bags: compostLogs
                .filter(r => toDateStr(r.date) === d)
                .reduce((s, r) => s + r.bags, 0),
        }));

        // Gas balance by digester (all time) — reuse meterReadings and allDistributions
        const metersByDig: Record<string, number[]> = {};
        for (const r of meterReadings) {
            if (!metersByDig[r.digesterId]) metersByDig[r.digesterId] = [];
            metersByDig[r.digesterId].push(r.reading);
        }

        const gasBalance = digesters.map(d => {
            const readings = metersByDig[d.id] ?? [];
            const produced = readings.length >= 2 ? +(readings[readings.length - 1] - readings[0]).toFixed(1) : 0;
            const distributed = +allDistributions
                .filter(r => r.digesterId === d.id)
                .reduce((s, r) => s + r.volume, 0)
                .toFixed(1);
            return { id: d.id, produced, distributed };
        });

        const compostByDigester = digesters.map(d => ({
            id: d.id,
            bags: allCompost.filter(r => r.digesterId === d.id).reduce((s, r) => s + r.bags, 0),
        }));

        return {
            gasTrend,
            fsTrend,
            feedstockByType,
            compostTrend,
            gasBalance,
            compostByDigester,
        };
    },

    getTableData: async (module: string, from?: string, to?: string) => {
        const where: Record<string, unknown> = {};
        if (from || to) {
            where.date = {};
            if (from) (where.date as Record<string, unknown>).gte = localDayStart(from);
            if (to) (where.date as Record<string, unknown>).lte = localDayEnd(to);
        }

        if (module === "feedstock") {
            return prisma.feedstockLog.findMany({
                where,
                orderBy: { date: "desc" },
                include: {
                    digester: { select: { location: true } },
                },
            }).then(rows => rows.map(r => ({
                id: r.id,
                date: toDateStr(r.date),
                digesterId: r.digesterId,
                location: r.digester.location,
                operatorId: r.operatorId,
                type: r.type,
                weight: r.weight,
                waterLitres: r.waterLitres,
                photoUrl: r.photoUrl,
                notes: r.notes,
            })));
        }

        if (module === "meter") {
            return prisma.flowMeterReading.findMany({
                where,
                orderBy: { date: "desc" },
                include: {
                    digester: { select: { location: true } },
                },
            }).then(rows => rows.map(r => ({
                id: r.id,
                date: toDateStr(r.date),
                digesterId: r.digesterId,
                location: r.digester.location,
                operatorId: r.operatorId,
                reading: r.reading,
                photoUrl: r.photoUrl,
                notes: r.notes,
            })));
        }

        if (module === "distribution") {
            return prisma.gasDistribution.findMany({
                where,
                orderBy: { date: "desc" },
                include: {
                    digester: { select: { location: true } },
                    household: { select: { headName: true, phone: true, members: true } },
                },
            }).then(rows => rows.map(r => ({
                id: r.id,
                date: toDateStr(r.date),
                digesterId: r.digesterId,
                location: r.digester.location,
                operatorId: r.operatorId,
                householdId: r.householdId,
                householdHead: r.household.headName,
                volume: r.volume,
            })));
        }

        if (module === "compost") {
            return prisma.compostLog.findMany({
                where,
                orderBy: { date: "desc" },
                include: {
                    digester: { select: { location: true } },
                },
            }).then(rows => rows.map(r => ({
                id: r.id,
                date: toDateStr(r.date),
                digesterId: r.digesterId,
                location: r.digester.location,
                operatorId: r.operatorId,
                bags: r.bags,
                photoUrl: r.photoUrl,
                notes: r.notes,
            })));
        }

        return [];
    },
};
