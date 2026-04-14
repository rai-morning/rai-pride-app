import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RAISE",
    short_name: "RAISE",
    description: "RAISE - マッチング＆コミュニティ",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#12121f",
    orientation: "portrait",
    icons: [
      {
        src: "/icon?size=192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon?size=512",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
