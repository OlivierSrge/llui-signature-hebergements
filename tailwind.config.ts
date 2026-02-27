import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#fdf8ed',
          100: '#f9eed4',
          200: '#f2daa3',
          300: '#e9c168',
          400: '#e2a83a',
          500: '#C9A84C',
          600: '#b8973b',
          700: '#9a7a2e',
          800: '#7d612a',
          900: '#674f26',
        },
        beige: {
          50:  '#fdfcf9',
          100: '#F5F0E8',
          200: '#EDE8DC',
          300: '#e0d8c8',
          400: '#cfc4ae',
          500: '#b8a990',
        },
        cream: '#FAFAF8',
        dark: '#1A1A1A',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #C9A84C 0%, #e2a83a 50%, #C9A84C 100%)',
        'gradient-hero': 'linear-gradient(to bottom, rgba(26,26,26,0.5) 0%, rgba(26,26,26,0.2) 100%)',
      },
      boxShadow: {
        'gold': '0 4px 24px rgba(201, 168, 76, 0.25)',
        'card': '0 2px 16px rgba(26, 26, 26, 0.08)',
        'card-hover': '0 8px 32px rgba(26, 26, 26, 0.16)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
