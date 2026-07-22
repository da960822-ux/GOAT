import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoots = ["app", "src", "components"];
const files = sourceRoots.flatMap((dir) => walk(path.join(root, dir))).filter((file) => /\.(ts|tsx)$/.test(file));
const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");

assert(!source.includes("@expo/vector-icons"), "icon-font dependency remains in UI source");
assert(!source.includes("PhotoAnalysisAdapter"), "photo analysis adapter remains");
assert(!fs.existsSync(path.join(root, "app", "photo-search.tsx")), "photo search route remains");
for (const route of ["recommendations.tsx", "map.tsx", "saved.tsx", "profile.tsx", path.join("login", "callback.tsx")]) {
  assert(fs.existsSync(path.join(root, "app", route)), `missing route: ${route}`);
}
const iconSource = fs.readFileSync(path.join(root, "src", "components", "BrandIcon.tsx"), "utf8");
for (const icon of ["menu", "notification", "location", "mood", "home", "recommend", "map", "bookmark", "user", "back", "share", "search", "time", "transport", "crowd", "course", "like", "dislike", "warning", "delete", "logout"]) {
  assert(iconSource.includes(`\"${icon}\"`), `missing BrandIcon: ${icon}`);
}
const recommendationSource = fs.readFileSync(path.join(root, "src", "services", "recommendationApi.ts"), "utf8");
assert(recommendationSource.includes("createRecommendation"), "official recommendation endpoint is not wired");
assert(recommendationSource.includes("Idempotency-Key"), "idempotency header is not wired");
const authSource = fs.readFileSync(path.join(root, "src", "context", "AuthContext.tsx"), "utf8");
for (const endpoint of ["/api/auth/me", "/api/auth/logout", "/api/auth/${provider}/start"]) assert(authSource.includes(endpoint), `missing auth endpoint: ${endpoint}`);

console.log(`GOAT v2 UI contract verified across ${files.length} source files.`);

function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : path.join(dir, entry.name)); }
function assert(value, message) { if (!value) throw new Error(message); }
