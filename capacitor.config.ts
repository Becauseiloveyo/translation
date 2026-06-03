import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.litedict.personal",
  appName: "LiteDict",
  webDir: "dist",
  server: {
    androidScheme: "https"
  }
};

export default config;

