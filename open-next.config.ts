import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "r2",
      tagCache: "d1",
      queue: "default",
    },
  },
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-edge",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "r2",
      tagCache: "d1",
      queue: "default",
    },
  },
  edgeExternals: ["node:crypto"],
};

export default defineCloudflareConfig(config as Parameters<typeof defineCloudflareConfig>[0]);