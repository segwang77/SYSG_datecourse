/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "firebasestorage.googleapis.com" }] },
};
export default nextConfig;
