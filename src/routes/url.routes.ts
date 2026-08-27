import { Router } from "express";
import { UrlController } from "../controllers/url.controller";
import { validate } from "../middleware/validate";
import { createUrlSchema } from "../validators/url.validator";

const router = Router();

router.post("/urls", validate(createUrlSchema), UrlController.createUrl);


export default router;
