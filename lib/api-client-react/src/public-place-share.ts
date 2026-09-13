export function buildPublicPlaceShare(
  publicBaseUrl: string,
  placeId: string,
  placeName: string,
  selectionId?: string,
) {
  const origin = new URL(publicBaseUrl).origin;
  const detailUrl = new URL(
    `/detail/${encodeURIComponent(placeId)}`,
    origin,
  );
  if (selectionId) detailUrl.searchParams.set("selectionId", selectionId);
  const url = detailUrl.toString();
  return { title: placeName, url, message: `${placeName}\n${url}` };
}
