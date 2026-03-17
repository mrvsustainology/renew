import { prisma } from "../../config/database";
import { comparePassword } from "../../utils/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from "../../utils/jwt";
import { AppError } from "../../utils/AppError";
import { LoginDto } from "@renew-hope/shared";

export const authService = {

    login: async (dto: LoginDto) => {
        // 1. Find user by ID
        const user = await prisma.user.findUnique({
            where: { id: dto.id },
        });

        if (!user) {
            // Generic message — do not reveal whether ID or password is wrong
            throw AppError.unauthorized("Invalid credentials");
        }

        // 2. Check account is active
        if (user.status !== "active") {
            throw AppError.forbidden("Account has been deactivated");
        }

        // 3. Verify password
        const isValid = await comparePassword(dto.password, user.passwordHash);
        if (!isValid) {
            throw AppError.unauthorized("Invalid credentials");
        }

        // 4. Build token payload
        const payload: TokenPayload = {
            id: user.id,
            name: user.name,
            role: user.role,
            status: user.status,
            digesterId: user.digesterId,
        };

        // 5. Sign tokens
        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken(payload);

        // 6. Return tokens + safe user object (no passwordHash)
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                status: user.status,
                digesterId: user.digesterId,
            },
        };
    },

    refresh: async (token: string) => {
        // 1. Verify refresh token
        const payload = verifyRefreshToken(token);

        // 2. Check user still exists
        const user = await prisma.user.findUnique({
            where: { id: payload.id },
        });

        if (!user) {
            throw AppError.unauthorized("User no longer exists");
        }

        // 3. If deactivated, allow 24-hour grace period
        if (user.status !== "active") {
            const GRACE_MS = 24 * 60 * 60 * 1000; // 24 hours
            const deactivatedAt = user.deactivatedAt ? new Date(user.deactivatedAt).getTime() : 0;
            const elapsed = Date.now() - deactivatedAt;

            if (!user.deactivatedAt || elapsed > GRACE_MS) {
                throw AppError.forbidden("Account has been deactivated. Contact admin.");
            }

            // Within grace — issue token but flag it
            const newPayload: TokenPayload = {
                id: user.id,
                name: user.name,
                role: user.role,
                status: user.status,
                digesterId: user.digesterId,
            };

            const accessToken = signAccessToken(newPayload);
            const remainingMs = GRACE_MS - elapsed;

            return {
                accessToken,
                deactivated: true,
                deactivatedAt: user.deactivatedAt.toISOString(),
                remainingHours: Math.max(0, Math.floor(remainingMs / (60 * 60 * 1000))),
            };
        }

        // 4. Active user — issue new access token normally
        const newPayload: TokenPayload = {
            id: user.id,
            name: user.name,
            role: user.role,
            status: user.status,
            digesterId: user.digesterId,
        };

        const accessToken = signAccessToken(newPayload);

        return { accessToken };
    },

    checkStatus: async (userId: string) => {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { status: true, deactivatedAt: true },
        });

        if (!user) throw AppError.notFound("User not found");

        if (user.status === "active") {
            return { status: "active" as const, deactivated: false };
        }

        const GRACE_MS = 24 * 60 * 60 * 1000;
        const deactivatedAt = user.deactivatedAt ? new Date(user.deactivatedAt).getTime() : 0;
        const elapsed = Date.now() - deactivatedAt;
        const remainingMs = Math.max(0, GRACE_MS - elapsed);

        return {
            status: "inactive" as const,
            deactivated: true,
            deactivatedAt: user.deactivatedAt?.toISOString() ?? null,
            remainingHours: Math.floor(remainingMs / (60 * 60 * 1000)),
            expired: !user.deactivatedAt || elapsed > GRACE_MS,
        };
    },

};