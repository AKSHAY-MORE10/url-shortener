import { Request, Response, NextFunction } from "express";
import { UrlService } from "../services/url.service";
import { AnalyticsService } from "../services/analytics.service";

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
      const { originalUrl, urlId } = await UrlService.resolveShortUrl(code as string);

      res.redirect(302, originalUrl);

      // Fire-and-forget: response already sent, don't make the client wait on this.
      AnalyticsService.recordClick(urlId, req).catch((err) => {
        console.error("Failed to record click analytics:", err);
      });
    } catch (err) {
      next(err);
    }
  },
};
