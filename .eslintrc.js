module.exports = {
  root: true,
  extends: [
    'airbnb-base',
    'plugin:json/recommended',
    'plugin:xwalk/recommended',
  ],
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
    'xwalk/max-cells': ['error', {
      '*': 4,
      // section properties render as key/value section metadata, not block cells
      section: 6,
      // lead form fields: label, type, options, required, half width
      'lead-form-field': 5,
      // lead form: heading, disclaimer, note, button label, category forms
      'lead-form': 5,
      // GST form fields: label, type, options, required, shown for
      'gst-form-field': 5,
      // service request: heading, button label, sheet, login subjects, login text, login link,
      // success text, error message
      'service-request': 8,
      // service request fields: label, type, options, required, half width, empty / invalid message
      'service-request-field': 7,
      // hero: heading, options, submit link, link text, category forms
      'hero-loan': 5,
      // EMI calculator loan type: title, amount, rate, tenure, image
      'emi-loan-type': 5,
      // feature banner item: image, mobile image, text, style, tablet image
      'feature-banner-item': 5,
      // link list: classes, side, intro, note, read all label, read less label
      'link-list': 6,
    }],
  },
};
