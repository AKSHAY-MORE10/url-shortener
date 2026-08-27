import { Request, Response, NextFunction } from "express";
import { UrlService } from "../services/url.service";

export const UrlController = {
  async createUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { originalUrl, expiresAt } = req.body;

      const result = await UrlService.createShortUrl({
        originalUrl,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
  async redirectToOriginal(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;
      const originalUrl = await UrlService.resolveShortUrl(code as string);
      res.redirect(302, originalUrl);
    } catch (err) {
      next(err);
    }
  },
};
