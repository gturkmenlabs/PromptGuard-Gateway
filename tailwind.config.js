/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#0d9488',
          900: '#134e4a',
          950: '#042f2e'
        },
        guard: {
          emerald: '#10b981',
          cyan: '#06b6d4',
          indigo: '#6366f1',
          violet: '#8b5cf6',
          amber: '#f59e0b',
          rose: '#f43f5e',
          slate: '#0f172a'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2.5s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(0%)', opacity: '0.2' },
          '50%': { transform: 'translateY(100%)', opacity: '0.8' },
        },
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(6, 182, 212, 0.6)' }
        }
      }
    },
  },
  plugins: [],
}
