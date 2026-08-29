import { Router } from "express";
import { UrlController } from "../controllers/url.controller";
import { validate } from "../middleware/validate";
import { rateLimit } from "../middleware/rateLimit";
import { createUrlSchema } from "../validators/url.validator";

const router = Router();

router.post("/urls", rateLimit(), validate(createUrlSchema), UrlController.createUrl);

export default router;
