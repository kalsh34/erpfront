/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand blue — the single accent for the whole app (both themes).
        navy: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#1e293b',
          800: '#152547',
          850: '#112246',
          900: '#0d1b36', // Panels / sidebar surface
          950: '#07152f', // Deep enterprise navy
        },
        cobalt: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // Primary action
          700: '#1d4ed8', // Secondary action / hover
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Theme-aware tokens (CSS variables — flip under `.dark`, see index.css)
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)', // page background
        surface: 'rgb(var(--c-surface) / <alpha-value>)', // cards, header, modals
        'surface-hover': 'rgb(var(--c-surface-hover) / <alpha-value>)',
        subtle: 'rgb(var(--c-subtle) / <alpha-value>)', // inner chips, tab rails
        'subtle-hover': 'rgb(var(--c-subtle-hover) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)', // main text
        muted: 'rgb(var(--c-muted) / <alpha-value>)', // secondary text
        subtext: 'rgb(var(--c-subtext) / <alpha-value>)', // tertiary text
        line: 'rgb(var(--c-line) / <alpha-value>)', // borders
        'line-strong': 'rgb(var(--c-line-strong) / <alpha-value>)',

        // Centralized semantic status tokens
        success: {
          DEFAULT: 'rgb(var(--c-success) / <alpha-value>)',
          subtle: 'rgb(var(--c-success-bg) / <alpha-value>)',
          text: 'rgb(var(--c-success-text) / <alpha-value>)',
          line: 'rgb(var(--c-success-border) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--c-warning) / <alpha-value>)',
          subtle: 'rgb(var(--c-warning-bg) / <alpha-value>)',
          text: 'rgb(var(--c-warning-text) / <alpha-value>)',
          line: 'rgb(var(--c-warning-border) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--c-danger) / <alpha-value>)',
          subtle: 'rgb(var(--c-danger-bg) / <alpha-value>)',
          text: 'rgb(var(--c-danger-text) / <alpha-value>)',
          line: 'rgb(var(--c-danger-border) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--c-info) / <alpha-value>)',
          subtle: 'rgb(var(--c-info-bg) / <alpha-value>)',
          text: 'rgb(var(--c-info-text) / <alpha-value>)',
          line: 'rgb(var(--c-info-border) / <alpha-value>)',
        },
      },
      borderColor: {
        DEFAULT: 'rgb(var(--c-line) / <alpha-value>)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        'card-hover': '0 8px 24px rgba(37, 99, 235, 0.10)',
        overlay: '0 20px 50px rgba(16, 24, 40, 0.18)',
      },
      keyframes: {
        overlayIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        modalIn: {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        helpIn: {
          from: { transform: 'translateX(24px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        overlayIn: 'overlayIn 150ms ease-out',
        modalIn: 'modalIn 180ms ease-out',
        helpIn: 'helpIn 200ms ease-out',
      },
    },
  },
  plugins: [],
};
