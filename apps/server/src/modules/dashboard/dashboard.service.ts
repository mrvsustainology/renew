import { prisma } from "../../config/database";
import { meterService } from "../meter/meter.service";
import { distributionService } from "../distribution/distribution.service";
import { compostService } from "../compost/compost.service";
import { localDateStr, localDayStart, localDayEnd, localNextDayStart } from "../../utils/localDate";

export const dashboardService = {

    getSummary: async (digesterId: string, clientToday?: string) => {
        const todayStr = clientToday && /^\d{4}-\d{2}-\d{2}$/.test(clientToday)
            ? clientToday
            : localDateStr();
        const todayStart = localDayStart(todayStr);
        const todayEnd = localDayEnd(todayStr);

        // ── Run all queries in parallel for performance
        const [
            digester,
            householdCount,
            lastMeterReading,
            gasBalance,
            totalCompostBags,
            feedstockAggregate,
            todayFeedstock,
            todayMeter,
            recentFeedstock,
            recentMeter,
            recentDistribution,
            recentCompost,
            last14DaysReadings,
        ] = await Promise.all([

            // Digester info
            prisma.digester.findUnique({
                where: { id: digesterId },
            }),

            // Total households
            prisma.household.count({
                where: { digesterId },
            }),

            // Last meter reading
            meterService.getLastReading(digesterId),

            // Gas balance
            distributionService.getBalance(digesterId),

            // Total compost bags
            compostService.getTotalBags(digesterId),

            // Total feedstock weight
            prisma.feedstockLog.aggregate({
                where: { digesterId },
                _sum: { weight: true },
            }),

            // Did operator log feedstock today?
            prisma.feedstockLog.findFirst({
                where: {
                    digesterId,
                    date: { gte: todayStart, lte: todayEnd },
                },
            }),

            // Did operator log meter today?
            prisma.flowMeterReading.findFirst({
                where: {
                    digesterId,
                    date: { gte: todayStart, lte: todayEnd },
                },
            }),

            // Recent feedstock logs
            prisma.feedstockLog.findMany({
                where: { digesterId },
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
                take: 5,
            }),

            // Recent meter readings
            prisma.flowMeterReading.findMany({
                where: { digesterId },
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
                take: 5,
            }),

            // Recent distribution
            prisma.gasDistribution.findMany({
                where: { digesterId },
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
                take: 5,
                include: {
                    household: {
                        select: { headName: true },
                    },
                },
            }),

            // Recent compost
            prisma.compostLog.findMany({
                where: { digesterId },
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
                take: 5,
            }),

            // Last 14 days meter readings for trend
            prisma.flowMeterReading.findMany({
                where: {
                    digesterId,
                    date: {
                        gte: new Date(
                            new Date().setDate(new Date().getDate() - 14)
                        ),
                    },
                },
                orderBy: { date: "asc" },
                select: { date: true, reading: true },
            }),

        ]);

        // ── Today's completion status
        const todayStatus = {
            feedstockLogged: !!todayFeedstock,
            meterLogged: !!todayMeter,
            isComplete: !!todayFeedstock && !!todayMeter,
        };

        // ── Derive daily production for last 14 days
        const gasTrend = last14DaysReadings.map((r, i) => {
            const prev = last14DaysReadings[i - 1];
            return {
                date: localDateStr(r.date),
                dailyProduction: prev
                    ? +(r.reading - prev.reading).toFixed(2)
                    : null,
            };
        }).filter(r => r.dailyProduction !== null);

        // ── Merge recent activity across all modules
        const recentActivity = [
            ...recentFeedstock.map(r => ({
                type: "feedstock" as const,
                date: localDateStr(r.date),
                createdAt: r.createdAt.toISOString(),
                summary: `${r.type} · ${r.weight} kg`,
                id: r.id,
                synced: true,
                hasPhoto: !!r.photoUrl,
            })),
            ...recentMeter.map(r => ({
                type: "meter" as const,
                date: localDateStr(r.date),
                createdAt: r.createdAt.toISOString(),
                summary: `Meter: ${r.reading} m³`,
                id: r.id,
                synced: true,
                hasPhoto: !!r.photoUrl,
            })),
            ...recentDistribution.map(r => ({
                type: "distribution" as const,
                date: localDateStr(r.date),
                createdAt: r.createdAt.toISOString(),
                summary: `${r.household.headName} · ${r.volume} m³`,
                id: r.id,
                synced: true,
                hasPhoto: false,
            })),
            ...recentCompost.map(r => ({
                type: "compost" as const,
                date: localDateStr(r.date),
                createdAt: r.createdAt.toISOString(),
                summary: `${r.bags} bags`,
                id: r.id,
                synced: true,
                hasPhoto: !!r.photoUrl,
            })),
        ]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 5);

        // ── Consecutive days streak
        //    Count how many days in a row had both feedstock + meter logged
        const streak = await dashboardService.getStreak(digesterId);

        return {
            digester: {
                id: digester?.id,
                location: digester?.location,
                status: digester?.status,
            },
            householdCount,
            gasBalance,
            lastMeterReading: lastMeterReading
                ? {
                    reading: lastMeterReading.reading,
                    date: lastMeterReading.date,
                }
                : null,
            totalCompostBags,
            totalFeedstockKg: +(feedstockAggregate._sum.weight ?? 0).toFixed(1),
            todayStatus,
            gasTrend,
            recentActivity,
            streak,
        };
    },

    // Calculate consecutive days streak
    getStreak: async (digesterId: string): Promise<number> => {
        let streak = 0;
        const check = new Date();

        // Check up to 30 days back
        for (let i = 0; i < 30; i++) {
            const dateStr = localDateStr(check);
            const dateStart = localDayStart(dateStr);
            const dateEnd = localDayEnd(dateStr);

            const [feedstock, meter] = await Promise.all([
                prisma.feedstockLog.findFirst({
                    where: {
                        digesterId,
                        date: { gte: dateStart, lte: dateEnd },
                    },
                }),
                prisma.flowMeterReading.findFirst({
                    where: {
                        digesterId,
                        date: { gte: dateStart, lte: dateEnd },
                    },
                }),
            ]);

            // Break streak if either is missing
            if (!feedstock || !meter) break;

            streak++;
            check.setDate(check.getDate() - 1);
        }

        return streak;
    },

};