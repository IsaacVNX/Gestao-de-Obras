
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | Gestão de Obras',
  description: 'Acesse o sistema de Gestão de Obras do Grupo Matos',
  icons: {
    icon: 'https://grupomatos.ind.br/storage/2024/06/Perfil-Grupo-Matos2.png',
  },
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
