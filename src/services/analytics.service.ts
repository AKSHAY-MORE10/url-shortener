import { Request } from "express";
import { ClickEventRepository } from "../repositories/clickEvent.repository";
import { UrlRepository } from "../repositories/url.repository";
import { hashIp } from "../utils/hash";

export const AnalyticsService = {
  async recordClick(urlId: bigint, req: Request): Promise<void> {
    const userAgent = req.headers["user-agent"];
    const referrer = req.headers["referer"] ?? req.headers["referrer"];

    await Promise.all([
      ClickEventRepository.create({
        urlId,
        ipHash: req.ip ? hashIp(req.ip) : undefined,
        userAgent: typeof userAgent === "string" ? userAgent : undefined,
        referrer: typeof referrer === "string" ? referrer : undefined,
      }),
      UrlRepository.incrementClickCount(urlId),
    ]);
  },
};
