import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { asyncHandler } from "../../utils/asyncHandler";
import { getPresignedUrl } from "../../utils/uploadToS3";
import { AppError } from "../../utils/AppError";

const router = Router();

/**
 * GET /photos/signed?url=<s3_url>
 * Returns a 1-hour pre-signed GET URL for any S3 object.
 * Requires valid JWT (operator or admin).
 */
router.get(
    "/signed",
    authenticate,
    asyncHandler(async (req, res) => {
        const { url } = req.query as { url?: string };
        if (!url) throw AppError.badRequest("url query param is required");

        const signed = await getPresignedUrl(url);
        res.json({ success: true, data: { signedUrl: signed } });
    }),
);

export default router;
