import { Router, type IRouter } from "express";
import { getGooglePlacePhotoSelection, getGooglePlacePhotoSelections } from "../services/google-place-photo-selections";
import { fetchGooglePhotoMedia, fetchGooglePlacePhotos } from "../services/google-place-photo-provider";
import { createRateLimiter } from "../lib/rate-limit";
import { googlePlacesContentEnabled } from "../lib/feature-flags";

const router: IRouter = Router();
const photoLimit = createRateLimiter({ windowMs: 60_000, max: 120 });
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]!);

router.get("/google-place-photo/:placeId/:candidateIndex", photoLimit, async (req, res) => {
  if (!googlePlacesContentEnabled()) {
    res.status(404).json({ success: false, code: "PHOTO_NOT_FOUND", message: "사진을 찾을 수 없습니다." });
    return;
  }
  const selection = getGooglePlacePhotoSelection(String(req.params.placeId));
  const candidateIndex = Number(req.params.candidateIndex);
  if (!selection || !Number.isInteger(candidateIndex) || !selection.candidateIndexes.includes(candidateIndex)) {
    res.status(404).json({ success: false, code: "PHOTO_NOT_FOUND", message: "사진을 찾을 수 없습니다." });
    return;
  }
  try {
    const media = await fetchGooglePhotoMedia(selection.googlePlaceId, candidateIndex);
    const contentType = media.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) throw new Error("GOOGLE_PHOTO_INVALID_CONTENT_TYPE");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.send(Buffer.from(await media.arrayBuffer()));
  } catch {
    res.status(502).json({ success: false, code: "PHOTO_PROVIDER_FAILED", message: "사진을 불러오지 못했습니다." });
  }
});

router.get("/google-place-photo-review", async (_req, res) => {
  if (process.env.NODE_ENV === "production" || !googlePlacesContentEnabled()) {
    res.status(404).send("Not found");
    return;
  }
  const places = await Promise.all(getGooglePlacePhotoSelections().map(async ([placeId, selection]) => ({
    placeId,
    photos: await fetchGooglePlacePhotos(placeId, selection.googlePlaceId, selection.candidateIndexes).catch(() => []),
  })));
  const cards = places.map(({ placeId, photos }) => `<section><h2>${escapeHtml(placeId)}</h2><div class="photos">${photos.map((photo, index) => `<figure><b>${String.fromCharCode(65 + index)}${index === 0 ? " · SELECTED" : " · BACKUP"}</b><img src="${escapeHtml(photo.url)}" alt="${escapeHtml(placeId)} 후보 ${index + 1}"><figcaption>Google Maps${photo.author ? ` · <a href="${escapeHtml(photo.attribution?.authorUri)}">${escapeHtml(photo.author)}</a>` : ""} · <a href="${escapeHtml(photo.attribution?.sourceUrl)}">원본 보기</a></figcaption></figure>`).join("")}</div></section>`).join("");
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.type("html").send(`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>GOAT Google Places 사진 검토</title><style>body{font-family:system-ui;margin:24px;background:#f7f4ec;color:#173f36}section{margin:0 0 36px}.photos{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}figure{margin:0;padding:12px;background:white;border:1px solid #d8d4c8;border-radius:12px}img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;margin:8px 0}figcaption{font-size:13px}a{color:#173f36}</style><h1>Google Places 적용 후보</h1><p>사진은 저장하지 않고 Places API에서 요청 시 다시 조회합니다.</p>${cards}</html>`);
});

export default router;
