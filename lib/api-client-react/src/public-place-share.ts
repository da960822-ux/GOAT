export function buildPublicPlaceShare(
  publicBaseUrl: string,
  placeId: string,
  placeName: string,
) {
  const origin = new URL(publicBaseUrl).origin;
  const url = new URL(
    `/detail/${encodeURIComponent(placeId)}`,
    origin,
  ).toString();
  return { title: placeName, url, message: `${placeName}\n${url}` };
}
