const colors = require('tailwindcss/colors');

module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        // ReviewHood identity, taken from the logo. Keep it identical in all three apps.
        // brand-500 is the logo's star green; brand-600 is the primary for buttons/links (5:1 with white, WCAG AA)
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#2fbf8a',
          500: '#0a9669',
          600: '#087f5b',
          700: '#06684a',
          800: '#06533c',
          900: '#073f2e',
        },
        // The wordmark's forest green: headings on light pages, dark bands, footer
        ink: {
          DEFAULT: '#0e3319',
          light: '#174a26',
        },
        // Star ratings only, never buttons or titles
        rating: '#f5b400',
        // Neutral grays (cool slate clashes with forest green); existing slate-/gray- classes pick this up
        slate: colors.zinc,
        gray: colors.zinc,
      },
      keyframes: {
        'float-a': {
          '0%, 100%': { transform: 'translateY(0) rotate(18deg)' },
          '50%': { transform: 'translateY(-14px) rotate(14deg)' },
        },
        'float-b': {
          '0%, 100%': { transform: 'translateY(0) rotate(-15deg)' },
          '50%': { transform: 'translateY(-10px) rotate(-19deg)' },
        },
      },
      animation: {
        'float-a': 'float-a 7s ease-in-out infinite',
        'float-a-fast': 'float-a 5s ease-in-out infinite',
        'float-b': 'float-b 8s ease-in-out infinite',
        'float-b-fast': 'float-b 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
