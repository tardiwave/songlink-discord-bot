import type { DenonConfig } from "https://deno.land/x/denon@2.5.0/mod.ts";
import { config as dotenv } from "https://deno.land/x/dotenv@v3.2.0/mod.ts";

const config: DenonConfig = {
  scripts: {
    start: {
      cmd: "deno run mod.ts",
      desc: "Make the bot online",
      allow: ["read", "env", "write", "net"],
      tsconfig: "tsconfig.json",
      unstable: true,
      env: dotenv(),
    },
  },
};

export default config;
