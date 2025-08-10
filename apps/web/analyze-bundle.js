const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const { execSync } = require("node:child_process");

// Create a minimal Next.js config for analysis
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: "json",
          openAnalyzer: false,
          generateStatsFile: true,
          statsFilename: "bundle-stats.json",
        }),
      );
    }
    return config;
  },
};

module.exports = nextConfig;

// Run build and analysis
console.log("Building with bundle analysis...");
try {
  execSync("ANALYZE=true npm run build", { stdio: "inherit" });
  console.log("Bundle analysis complete. Check ./next/analyze/ for results.");
} catch (error) {
  console.error("Build failed:", error.message);
}
