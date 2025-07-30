import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* opções de configuração aqui */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'grupomatos.ind.br',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
