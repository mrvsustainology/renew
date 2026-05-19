import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { uploadToS3 } from "../../utils/uploadToS3";
import { CreateFeedstockDto } from "@renew-hope/shared";
import { buildTimestamp, localDateStr } from "../../utils/localDate";

export const feedstockService = {

    // Create feedstock log with photo
    create: async (
        dto: CreateFeedstockDto,
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

        // 2. Upload photo to S3
        const { url: photoUrl } = await uploadToS3(
            photo.buffer,
            `feedstock/${digesterId}`,
            photo.originalname,
            photo.mimetype
        );

        // 3. Create feedstock log
        const log = await prisma.feedstockLog.create({
            data: {
                date: buildTimestamp(dto.date),
                type: dto.type,
                weight: dto.weight,
                type2: dto.type2 ?? null,
                weight2: dto.weight2 ?? null,
                waterLitres: dto.waterLitres ?? 0,
                notes: dto.notes,
                photoUrl,
                digesterId,
                operatorId,
            },
        });

        return { ...log, date: localDateStr(log.date) };
    },

    // Get feedstock logs for a digester with optional date filter
    getByDigester: async (
        digesterId: string,
        from?: string,
        to?: string
    ) => {
        const logs = await prisma.feedstockLog.findMany({
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
            orderBy: { date: "desc" },
        });

        return logs.map(l => ({ ...l, date: localDateStr(l.date) }));
    },

    // Admin — get all feedstock logs across all digesters
    getAll: async (from?: string, to?: string) => {
        const logs = await prisma.feedstockLog.findMany({
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

        return logs.map(l => ({ ...l, date: localDateStr(l.date) }));
    },

};