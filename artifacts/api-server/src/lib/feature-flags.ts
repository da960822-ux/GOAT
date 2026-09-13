export function googlePlacesContentEnabled() {
  return process.env.ENABLE_GOOGLE_PLACES_CONTENT?.trim().toLowerCase() === "true";
}
