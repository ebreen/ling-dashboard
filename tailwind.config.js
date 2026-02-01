/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          deepest: '#0A0A0A',
          dark: '#0D0D0D',
          panel: '#111111',
          card: '#171717',
          hover: '#222222',
        },
        text: {
          primary: '#E5E5E5',
          secondary: '#999999',
          muted: '#666666',
        },
        accent: {
          orange: '#E07020',
          'orange-hover': '#D96C1A',
          green: '#22C55E',
          gold: '#D4A520',
        },
        border: {
          subtle: '#2A2A2A',
          divider: '#333333',
          active: '#404040',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
