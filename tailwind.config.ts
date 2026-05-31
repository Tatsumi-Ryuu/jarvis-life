import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        panel: 'var(--color-panel)',
        'panel-soft': 'var(--color-panel-soft)',
        'panel-strong': 'var(--color-panel-strong)',
        action: 'var(--color-action)',
        'border-strong': 'var(--color-border-strong)',
        'border-soft': 'var(--color-border-soft)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'status-available': 'var(--color-status-available)',
        'warm-accent': 'var(--color-warm-accent)',
        danger: 'var(--color-danger)',
        placeholder: 'var(--color-placeholder)',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'sans-serif'],
      },
      fontSize: {
        'page-title': ['calc(30px * var(--font-scale, 1))', { fontWeight: '700', lineHeight: '1.2' }],
        'card-title': ['calc(28px * var(--font-scale, 1))', { fontWeight: '700', lineHeight: '1.2' }],
        'topbar-value': ['calc(26px * var(--font-scale, 1))', { fontWeight: '700', lineHeight: '1.2' }],
        'tab-title': ['calc(24px * var(--font-scale, 1))', { fontWeight: '700', lineHeight: '1.2' }],
        'btn-secondary': ['calc(22px * var(--font-scale, 1))', { fontWeight: '700', lineHeight: '1.2' }],
        'body': ['calc(20px * var(--font-scale, 1))', { fontWeight: '400', lineHeight: '1.5' }],
        'status': ['calc(18px * var(--font-scale, 1))', { fontWeight: '700', lineHeight: '1.2' }],
        'resource-label': ['calc(16px * var(--font-scale, 1))', { fontWeight: '700', lineHeight: '1.2' }],
        'tab-subtitle': ['calc(15px * var(--font-scale, 1))', { fontWeight: '400', lineHeight: '1.2' }],
        'small': ['calc(13px * var(--font-scale, 1))', { fontWeight: '400', lineHeight: '1.4' }],
      },
      boxShadow: {
        'card': '10px 10px 0 rgba(31, 111, 152, 0.30)',
        'tab-active': '8px 8px 0 rgba(46, 126, 168, 0.30)',
        'secondary': '6px 6px 0 rgba(46, 126, 168, 0.30)',
        'topbar': '0 8px 0 rgba(31, 111, 152, 0.30)',
      },
      borderWidth: {
        'main': '6px',
        'inner': '4px',
        'subtle': '3px',
      },
      spacing: {
        'topbar-h': '96px',
        'btn-primary-w': '260px',
        'btn-primary-h': '86px',
        'btn-secondary-w': '190px',
        'btn-secondary-h': '60px',
        'tab-w': '284px',
        'tab-h': '92px',
        'card-w': '1118px',
        'card-h': '194px',
        'header-h': '64px',
        'scene-w': '1920px',
        'scene-h': '1080px',
      },
    },
  },
  plugins: [],
};

export default config;
