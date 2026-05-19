import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { uploadToS3 } from "../../utils/uploadToS3";
import { CreateMeterReadingDto } from "@renew-hope/shared";
import { localDateStr, localDayStart, localNextDayStart, buildTimestamp } from "../../utils/localDate";

export const meterService = {

    // Submit new meter reading
    create: async (
        dto: CreateMeterReadingDto,
        digesterId: string,
        operatorId: string,
        photo: Express.Multer.File
    ) => {
        // 1. Verify digester exists and is active
        const digester = await prisma.digester.findUnique({
            where: { id: digesterId },
        });

        if (!digester) {
            throw AppError.notFound("Digester not found");
        }

        if (digester.status !== "active") {
            throw AppError.badRequest("Digester is not active");
        }

        // 2. Get last reading — sort by date first (handles seeded data), then createdAt as tiebreaker
        const lastReading = await prisma.flowMeterReading.findFirst({
            where: { digesterId },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        });

        // 3. New reading must be greater than last reading
        if (lastReading && dto.reading <= lastReading.reading) {
            throw AppError.badRequest(
                `Reading must be greater than last reading (${lastReading.reading} m³)`
            );
        }

        // 4. Upload photo to S3
        const { url: photoUrl } = await uploadToS3(
            photo.buffer,
            `meter/${digesterId}`,
            photo.originalname,
            photo.mimetype
        );

        // 5. Create reading
        const reading = await prisma.flowMeterReading.create({
            data: {
                date: buildTimestamp(dto.date),
                reading: dto.reading,
                notes: dto.notes,
                photoUrl,
                digesterId,
                operatorId,
            },
        });

        // 6. Derive daily production
        const dailyProduction = lastReading
            ? +(dto.reading - lastReading.reading).toFixed(2)
            : null;

        return {
            ...reading,
            dailyProduction,
            isFirstReading: !lastReading,
        };
    },

    // Get all readings for a digester with derived daily production
    getByDigester: async (
        digesterId: string,
        from?: string,
        to?: string
    ) => {
        const readings = await prisma.flowMeterReading.findMany({
            where: {
                digesterId,
                ...(from || to
                    ? {
                        date: {
                            ...(from ? { gte: new Date(from) } : {}),
                            ...(to ? { lte: new Date(to) } : {}),
                        },
                    }
                    : {}),
            },
            orderBy: { date: "asc" },
        });

        // Derive daily production for each reading
        const withProduction = readings.map((reading, index) => {
            const prev = readings[index - 1];
            const dailyProduction = prev
                ? +(reading.reading - prev.reading).toFixed(2)
                : null;

            return {
                ...reading,
                date: localDateStr(reading.date), // local "YYYY-MM-DD"
                dailyProduction,
                isFirstReading: index === 0,
            };
        });

        // Return in descending order for display
        return withProduction.reverse();
    },

    // Get last reading for a digester.
    // Also returns today's CUMULATIVE production:
    //   = latestReadingToday − lastReadingBeforeToday
    // so multiple readings in a day accumulate correctly.
    getLastReading: async (digesterId: string) => {
        // Latest reading overall — date desc so seeded batch data is handled correctly
        const latest = await prisma.flowMeterReading.findFirst({
            where: { digesterId },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        });

        if (!latest) return null;

        // Derive "today" from the latest reading's stored date using local timezone.
        const latestDateStr = localDateStr(latest.date);
        const todayStart = localDayStart(latestDateStr);
        const tomorrowStart = localNextDayStart(latestDateStr);

        // Latest reading logged on the same day as the latest reading
        const latestToday = await prisma.flowMeterReading.findFirst({
            where: { digesterId, date: { gte: todayStart, lt: tomorrowStart } },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        });

        let dailyProduction: number | null = null;
        if (latestToday) {
            // Last reading BEFORE that day — baseline for daily delta
            const lastBeforeToday = await prisma.flowMeterReading.findFirst({
                where: { digesterId, date: { lt: todayStart } },
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            });
            dailyProduction = lastBeforeToday
                ? +(latestToday.reading - lastBeforeToday.reading).toFixed(2)
                : 0;
        }

        return {
            ...latest,
            date: localDateStr(latest.date), // return local "YYYY-MM-DD" not raw UTC Date
            dailyProduction,
        };
    },

    // Get total gas produced for a digester
    getTotalProduced: async (
        digesterId: string,
        from?: string,
        to?: string
    ) => {
        const readings = await prisma.flowMeterReading.findMany({
            where: {
                digesterId,
                ...(from || to
                    ? {
                        date: {
                            ...(from ? { gte: new Date(from) } : {}),
                            ...(to ? { lte: new Date(to) } : {}),
                        },
                    }
                    : {}),
            },
            orderBy: { date: "asc" },
            select: { reading: true },
        });

        if (readings.length < 1) return 0;

        // Total produced = last cumulative meter reading
        return +readings[readings.length - 1].reading.toFixed(2);
    },

    // Admin — get all readings across all digesters
    getAll: async (from?: string, to?: string) => {
        const readings = await prisma.flowMeterReading.findMany({
            where: {
                ...(from || to
                    ? {
                        date: {
                            ...(from ? { gte: new Date(from) } : {}),
                            ...(to ? { lte: new Date(to) } : {}),
                        },
                    }
                    : {}),
            },
            orderBy: { date: "desc" },
            include: {
                digester: {
                    select: { id: true, location: true },
                },
            },
        });

        return readings;
    },

};