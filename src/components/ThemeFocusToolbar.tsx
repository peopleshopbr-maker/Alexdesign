import { useEffect, useState } from 'react';
import { Sun, Moon, Eye, EyeOff } from 'lucide-react';

export function ThemeFocusToolbar() {
  const [theme, setTheme] = useState<'beige' | 'dark'>(() => {
    try {
      return (localStorage.getItem('alexdesign_theme') as 'beige' | 'dark') || 'beige';
    } catch {
      return 'beige';
    }
  });

  const [zenMode, setZenMode] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('alexdesign_theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-zen', zenMode ? 'true' : 'false');
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setZenMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zenMode]);

  return (
    <div
      className="fixed bottom-14 sm:bottom-4 right-3 z-50 flex items-center gap-1.5 p-1 rounded-full border shadow-lg backdrop-blur-md"
      style={{
        backgroundColor: theme === 'beige' ? 'rgba(253, 251, 247, 0.9)' : 'rgba(15, 19, 27, 0.88)',
        borderColor: theme === 'beige' ? '#d6cbb8' : '#1e293b',
      }}
    >
      <button
        type="button"
        onClick={() => setTheme((t) => (t === 'beige' ? 'dark' : 'beige'))}
        title={theme === 'beige' ? 'Alternar para Estúdio Escuro' : 'Alternar para Bege Elegante'}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium cursor-pointer"
        style={{
          color: theme === 'beige' ? '#2c2621' : '#f1f5f9',
        }}
      >
        {theme === 'beige' ? (
          <>
            <Moon className="w-3.5 h-3.5 text-[#b86b35]" />
            <span className="hidden md:inline">Escuro</span>
          </>
        ) : (
          <>
            <Sun className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden md:inline">Bege</span>
          </>
        )}
      </button>

      <div
        className="w-px h-4"
        style={{ backgroundColor: theme === 'beige' ? '#d6cbb8' : '#334155' }}
      />

      <button
        type="button"
        onClick={() => setZenMode((z) => !z)}
        title="Modo Foco: Ocultar/Mostrar Painéis (Atalho: Tab)"
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium cursor-pointer"
        style={{
          backgroundColor: zenMode ? '#b86b35' : 'transparent',
          color: zenMode ? '#fdfbf7' : theme === 'beige' ? '#2c2621' : '#f1f5f9',
        }}
      >
        {zenMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        <span className="hidden md:inline">{zenMode ? 'Mostrar Menus' : 'Foco 3D'}</span>
      </button>
    </div>
  );
}
