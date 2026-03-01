/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'New York'", 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F5F3EF',
          tertiary: '#EEEBE4',
          border: '#DDD9D1',
          'border-strong': '#C9C4BB',
        },
        text: {
          primary: '#3b3c36',
          secondary: '#6e6e66',
          tertiary: '#9e9d97',
        },
        openai: {
          DEFAULT: '#10A37F',
          light: '#ECFDF5',
          border: '#A7F3D0',
        },
        anthropic: {
          DEFAULT: '#D97706',
          light: '#FFFBEB',
          border: '#FDE68A',
        },
        gemini: {
          DEFAULT: '#4285F4',
          light: '#EFF6FF',
          border: '#BFDBFE',
        },
        strategy: {
          council: '#8B5CF6',
          hybrid: '#F59E0B',
          single: '#3b3c36',
        },
        verdict: {
          pass: '#10B981',
          warn: '#F59E0B',
          fail: '#EF4444',
        },
        accent: {
          DEFAULT: '#d99058',
          hover: '#c47d45',
          foreground: '#FFFFFF',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
