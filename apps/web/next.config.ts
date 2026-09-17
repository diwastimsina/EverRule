import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@everrule/rule-schema", "@everrule/loophole-engine", "@everrule/rule-tests", "@everrule/policy-generator"],
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
};

export default nextConfig;
