export function getPhotoCachePolicy(photo: { cacheEnabled: boolean }) {
  return photo.cacheEnabled ? ("memory-disk" as const) : ("none" as const);
}
