module.exports = {
  prefix: 'twcss-',
  content: [
    './layout/*.liquid',
    './templates/*.liquid',
    './templates/customers/*.liquid',
    './sections/*.liquid',
    './snippets/*.liquid',
  ],
  theme: {
    screens: {
      sm: '320px',
      md: '750px',
      lg: '990px',
      xlg: '1440px',
      x2lg: '1920px',
      pageMaxWidth: '1440px',
    },
    extend: {
      colors: {
        brandblue: '#0044cc',
        brandblack: '#090a0c',
        brandwhite: '#fafaff',
        brandyellow: '#f5ae2e',
        brandred: '#c50f0f',
      },
      fontFamily: {
        heading: 'var(--font-heading-family)',
      },
    },
  },
  plugins: [],
  safelist: [
    {
      pattern: /twcss-grid-cols-\[.*\]/,
    },
  ],
};
