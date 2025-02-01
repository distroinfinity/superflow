/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        // Option 1: Disable image optimization to allow images from any domain
        unoptimized: true,

        // Option 2: Custom loader (optional, if you want to use a custom image loader)
        // Uncomment the lines below if you prefer to use a custom loader instead of disabling optimization.
        // loader: 'custom',
        // path: '/',

        // If you want to allow images from specific domains instead, you can use:
        // domains: ['example.com', 'anotherdomain.com'],
    },
};

export default nextConfig;
