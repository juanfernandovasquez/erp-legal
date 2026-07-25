/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef0fa',
          100: '#d5daf2',
          200: '#b0bae6',
          300: '#8a9ad9',
          400: '#6479cc',
          500: '#3e59bf',
          600: '#1e35a3',
          700: '#06186d',
          800: '#051258',
          900: '#030c43',
        },
        gold: {
          50:  '#fdf6e8',
          100: '#f8e7c0',
          200: '#f2cf81',
          300: '#ecb742',
          400: '#d49a35',
          500: '#b07d2f',
          600: '#8c6226',
          700: '#6b4b1e',
          800: '#4a3415',
          900: '#291d0c',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        base: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
}
