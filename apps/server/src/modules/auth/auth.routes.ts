import { Router } from "express";
import { login, refresh, logout, me, checkStatus } from "./auth.controller";
import { authenticate } from "../../middleware/authenticate";

const router = Router();

// Public routes
router.post("/login", login);
router.post("/refresh", refresh);

// Protected routes
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);
router.get("/check-status", authenticate, checkStatus);

export default router;