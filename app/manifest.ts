import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CABO - Card Game",
    short_name: "CABO",
    description: "Memory, tactics & rapid card swaps",
    start_url: "/",
    display: "standalone",
    background_color: "#070d1f",
    theme_color: "#070d1f",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
