import path from "node:path";
import { fileURLToPath } from "node:url";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/** @type {import("next").NextConfig} */
const nextConfig = {
  turbopack: {
    root: dirname,
  },
};

export default nextConfig;