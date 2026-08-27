import { Router } from "express";
import { UrlController } from "../controllers/url.controller";

const router = Router();
router.get("/:code", UrlController.redirectToOriginal);

export default router;