import type { Config } from 'tailwindcss';

/**
 * Savora design tokens.
 * Every color, font, shadow and radius used in the product is declared here
 * so all four developers work from one visual language.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: '#F5F0E7',
          50: '#FBF8F1',
          100: '#F5F0E7',
          200: '#EDE5D7',
          300: '#E2D6C3',
        },
        cream: '#FBF8F1',
        olive: {
          DEFAULT: '#354638',
          50: '#EEF1EC',
          100: '#DDE3D9',
          200: '#B9C3B2',
          300: '#93A18A',
          400: '#87917B',
          500: '#5C6B52',
          600: '#45543F',
          700: '#354638',
          800: '#2A382C',
          900: '#1E2A21',
        },
        terracotta: {
          DEFAULT: '#C65D3B',
          50: '#FBEEE9',
          100: '#F6DCD2',
          200: '#EDB9A5',
          300: '#E0947A',
          400: '#D47656',
          500: '#C65D3B',
          600: '#A94B2D',
          700: '#893B23',
          800: '#6A2D1B',
          900: '#4C2013',
        },
        gold: {
          DEFAULT: '#D6AA70',
          50: '#FAF3E9',
          100: '#F3E5D0',
          200: '#E8CDA5',
          300: '#D6AA70',
          400: '#C79755',
          500: '#B3813F',
          600: '#936832',
          700: '#725026',
        },
        brown: {
          DEFAULT: '#49382E',
          50: '#F4EFEB',
          100: '#E7DCD5',
          200: '#CFBBB0',
          300: '#B0968A',
          400: '#8A6E60',
          500: '#6B5243',
          600: '#59453A',
          700: '#49382E',
          800: '#3A2C24',
          900: '#2B211B',
        },
        ink: '#2B211B',
        success: '#3F7A52',
        warning: '#B3813F',
        danger: '#B3452F',
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1.1', letterSpacing: '0.08em' }],
        'display-xl': ['clamp(3.25rem, 6vw, 5.5rem)', { lineHeight: '0.98', letterSpacing: '-0.02em' }],
        'display-lg': ['clamp(2.5rem, 4.4vw, 4rem)', { lineHeight: '1.02', letterSpacing: '-0.015em' }],
        'display-md': ['clamp(2rem, 3.2vw, 3rem)', { lineHeight: '1.06', letterSpacing: '-0.01em' }],
      },
      spacing: {
        section: 'clamp(4.5rem, 8vw, 8rem)',
        gutter: 'clamp(1.25rem, 4vw, 3rem)',
      },
      borderRadius: {
        card: '1.125rem',
        panel: '1.5rem',
        arch: '14rem 14rem 1.25rem 1.25rem',
        pill: '999px',
      },
      boxShadow: {
        soft: '0 18px 40px -28px rgba(73, 56, 46, 0.45)',
        lift: '0 32px 60px -32px rgba(73, 56, 46, 0.5)',
        card: '0 2px 4px rgba(73, 56, 46, 0.04), 0 18px 40px -28px rgba(73, 56, 46, 0.35)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.35)',
      },
      maxWidth: {
        shell: '82rem',
        prose: '42rem',
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'soft-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.55' },
          '50%': { transform: 'scale(1.7)', opacity: '0' },
        },
        'marquee': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'shimmer': {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        'slide-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'chip-in': {
          from: { opacity: '0', transform: 'translateY(6px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'dialog-out': {
          from: { opacity: '1', transform: 'translateY(0) scale(1)' },
          to: { opacity: '0', transform: 'translateY(12px) scale(0.96)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.5s ease-out both',
        'soft-pulse': 'soft-pulse 2.8s ease-out infinite',
        'marquee': 'marquee 38s linear infinite',
        'shimmer': 'shimmer 1.8s linear infinite',
        'slide-in': 'slide-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'chip-in': 'chip-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-out': 'fade-out 0.3s ease-in both',
        'dialog-out': 'dialog-out 0.3s ease-in both',
      },
    },
  },
  plugins: [],
} satisfies Config;
