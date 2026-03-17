import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { dashboardService } from "./dashboard.service";
import { AppError } from "../../utils/AppError";

// GET /dashboard
export const getDashboard = asyncHandler(
    async (req: Request, res: Response) => {
        const user = req.user!;

        if (!user.digesterId) {
            throw AppError.forbidden("No digester assigned to this operator");
        }

        // Client sends its local date so "today" matches the user's timezone
        const clientToday = typeof req.query.today === "string" ? req.query.today : undefined;

        const summary = await dashboardService.getSummary(user.digesterId, clientToday);

        res.status(200).json({
            success: true,
            data: summary,
        });
    }
);