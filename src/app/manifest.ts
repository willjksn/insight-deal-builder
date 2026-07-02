import type { MetadataRoute } from "next";
import {
  APP_NAME,
  APP_TAGLINE,
  BRAND_ICON_192_PATH,
  BRAND_ICON_512_PATH,
  BRAND_THEME_COLOR,
} from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_TAGLINE,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BRAND_THEME_COLOR,
    theme_color: BRAND_THEME_COLOR,
    icons: [
      {
        src: BRAND_ICON_192_PATH,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: BRAND_ICON_512_PATH,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: BRAND_ICON_512_PATH,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
