/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './overlay.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        posture: {
          bg: '#0f172a',
          good: '#22c55e',
          bad: '#ef4444',
          neutral: '#64748b',
          warning: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};
