import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import logoLight from '@/assets/logo-light.png';
import logoDark from '@/assets/logo-dark.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={`${getSizeClasses(size)} ${className}`} />;
  }

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const logoSrc = currentTheme === 'dark' ? logoDark : logoLight;

  return (
    <img
      src={logoSrc}
      alt="Resolution Hub - Legalify Colombia"
      className={`${getSizeClasses(size)} ${className} object-contain`}
    />
  );
}

function getSizeClasses(size: 'sm' | 'md' | 'lg' | 'xl'): string {
  switch (size) {
    case 'sm':
      return 'h-6 w-auto sm:h-8';
    case 'md':
      return 'h-8 w-auto sm:h-10';
    case 'lg':
      return 'h-10 w-auto sm:h-12 md:h-14';
    case 'xl':
      return 'h-12 w-auto sm:h-16 md:h-20';
    default:
      return 'h-8 w-auto sm:h-10';
  }
}