import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './store/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(218 23% 89%)',
        background: 'hsl(220 43% 98%)',
        foreground: 'hsl(224 34% 17%)',
        muted: 'hsl(218 31% 95%)',
        'muted-foreground': 'hsl(218 16% 45%)',
        primary: {
          DEFAULT: 'hsl(230 87% 60%)',
          foreground: 'hsl(0 0% 100%)',
        },
        secondary: {
          DEFAULT: 'hsl(190 80% 43%)',
          foreground: 'hsl(0 0% 100%)',
        },
        success: 'hsl(146 65% 40%)',
        warning: 'hsl(36 93% 54%)',
        danger: 'hsl(0 78% 58%)',
      },
      boxShadow: {
        glass: '0 14px 38px -18px rgba(30, 64, 175, 0.4)',
        card: '0 12px 30px -18px rgba(15, 23, 42, 0.25)',
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
  plugins: [],
};

export default config;
