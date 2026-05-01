import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bemanningslijst",
    short_name: "Bemanningslijst",
    description: "Bemanningslijst management systeem",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f3a6d",
    icons: [
      {
        src: "/bemanningslijst-icon.png.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/bemanningslijst-icon.png.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/bemanningslijst-icon.png.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
