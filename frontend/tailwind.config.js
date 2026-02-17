/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F9FAFB',
          tertiary: '#F3F4F6',
          border: '#E5E7EB',
          'border-strong': '#D1D5DB',
        },
        text: {
          primary: '#111827',
          secondary: '#6B7280',
          tertiary: '#9CA3AF',
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
          single: '#6B7280',
        },
        verdict: {
          pass: '#10B981',
          warn: '#F59E0B',
          fail: '#EF4444',
        },
        accent: {
          DEFAULT: '#111827',
          hover: '#1F2937',
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
