import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'am';

interface UIState {
  theme: Theme;
  language: Language;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setLanguage: (l: Language) => void;
}

/** Apply the current theme to <html> (Tailwind dark: reads this class). */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  root.style.colorScheme = theme;
}

/** Apply the current language to <html> (font stack + a11y). */
export function applyLanguage(lang: Language) {
  document.documentElement.lang = lang;
}

/**
 * UI preferences: theme + language, persisted to localStorage.
 * The appliers run on store init and on every change so the whole
 * app flips instantly.
 */
export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      language: 'en',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      toggleTheme: () => {
        const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme });
        applyTheme(theme);
      },
      setLanguage: (language) => {
        set({ language });
        applyLanguage(language);
      },
    }),
    {
      name: 'vitalpayroll-ui',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
          applyLanguage(state.language);
        }
      },
    }
  )
);

// Apply immediately at module load (before first paint of React tree).
applyTheme(useUIStore.getState().theme);
applyLanguage(useUIStore.getState().language);
