/**
 * KTO (Korea Tourism Organization) API Proxy
 *
 * Proxies requests to apis.data.go.kr server-side to avoid CORS restrictions
 * in the browser-based Expo web build.
 *
 * Route: GET /api/kto?path=<KTO_endpoint_path>&<KTO_params>
 *   e.g. /api/kto?path=PhotoGalleryService1/galleryList1&keyword=춘천&numOfRows=5&...
 *
 * The serviceKey is never exposed to the client — it is read from the server
 * environment and appended here.
 */

import { Router, Request, Response } from "express";

const router = Router();

const KTO_BASE = "https://apis.data.go.kr/B551011";
const SERVICE_KEY = (process.env.KTO_SERVICE_KEY ?? "").trim();

router.get("/kto", async (req: Request, res: Response) => {
  try {
    if (!SERVICE_KEY) {
      res.status(500).json({ error: "KTO service key not configured on server" });
      return;
    }

    const { path: ktoPath, ...rest } = req.query as Record<string, string>;

    if (!ktoPath) {
      res.status(400).json({ error: "path query param is required" });
      return;
    }

    // Forward all other params to KTO, appending serviceKey server-side
    const paramStr = Object.entries(rest)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");

    const url = `${KTO_BASE}/${ktoPath}?serviceKey=${SERVICE_KEY}${paramStr ? `&${paramStr}` : ""}`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      res.status(response.status).json({ error: `KTO returned ${response.status}` });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch {
    res.status(500).json({ error: "proxy fetch failed" });
  }
});

export default router;
