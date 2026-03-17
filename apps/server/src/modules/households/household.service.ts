import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { CreateHouseholdDto } from "@renew-hope/shared";

export const householdService = {

    // Get all households for a digester
    getByDigester: async (digesterId: string) => {
        const households = await prisma.household.findMany({
            where: { digesterId },
            orderBy: { joinedAt: "desc" },
        });

        return households;
    },

    // Create a new household
    create: async (dto: CreateHouseholdDto, digesterId: string) => {
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

        // 2. Check duplicate phone within same digester
        const existing = await prisma.household.findFirst({
            where: {
                digesterId,
                phone: dto.phone,
            },
        });

        if (existing) {
            throw AppError.badRequest(
                "A household with this phone number already exists on this digester"
            );
        }

        // 3. Create household
        const household = await prisma.household.create({
            data: {
                headName: dto.headName,
                phone: dto.phone,
                address: dto.address,
                members: dto.members,
                fuelReplaced: dto.fuelReplaced,
                digesterId,
            },
        });

        return household;
    },

    // Get single household by ID
    getById: async (id: string, digesterId: string) => {
        const household = await prisma.household.findFirst({
            where: { id, digesterId },
        });

        if (!household) {
            throw AppError.notFound("Household not found");
        }

        return household;
    },

    // Update a household (admin only)
    update: async (id: string, data: {
        headName?: string;
        phone?: string;
        address?: string | null;
        members?: number;
        fuelReplaced?: string[];
    }) => {
        const household = await prisma.household.findUnique({ where: { id } });
        if (!household) {
            throw AppError.notFound("Household not found");
        }

        // If phone is changing, check for duplicates on same digester
        if (data.phone && data.phone !== household.phone) {
            const existing = await prisma.household.findFirst({
                where: {
                    digesterId: household.digesterId,
                    phone: data.phone,
                    id: { not: id },
                },
            });
            if (existing) {
                throw AppError.badRequest(
                    "A household with this phone number already exists on this digester"
                );
            }
        }

        return prisma.household.update({
            where: { id },
            data,
        });
    },

    // Delete a household (admin only)
    delete: async (id: string) => {
        const household = await prisma.household.findUnique({ where: { id } });
        if (!household) {
            throw AppError.notFound("Household not found");
        }

        // Delete related distributions first, then household
        await prisma.gasDistribution.deleteMany({ where: { householdId: id } });
        return prisma.household.delete({ where: { id } });
    },

    // Admin — get all households across all digesters
    getAll: async () => {
        const households = await prisma.household.findMany({
            orderBy: { joinedAt: "desc" },
            include: {
                digester: {
                    select: {
                        id: true,
                        location: true,
                    },
                },
            },
        });

        return households;
    },

};