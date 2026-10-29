import { useUIStore } from '../stores/uiStore';

/** Light/dark switch — sun/moon icon button used in headers. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`p-2 rounded-xl text-muted hover:text-ink hover:bg-subtle border border-line bg-surface transition-colors ${className}`}
    >
      {theme === 'dark' ? (
        // Sun icon
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        // Moon icon
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

/** EN / አማ toggle — compact segmented control used in headers. */
export function LanguageToggle({ className = '' }: { className?: string }) {
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-line bg-surface p-0.5 ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
          language === 'en' ? 'bg-primary-600 text-white' : 'text-muted hover:text-ink'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('am')}
        aria-pressed={language === 'am'}
        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
          language === 'am' ? 'bg-primary-600 text-white' : 'text-muted hover:text-ink'
        }`}
        title="አማርኛ"
      >
        አማ
      </button>
    </div>
  );
}
