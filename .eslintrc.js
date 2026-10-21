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
      section: 5,
      // lead form fields: label, type, options, required, half width, option identifiers
      'lead-form-field': 6,
      // lead form: heading, disclaimer, note, button label, category forms
      'lead-form': 5,
      // hero: heading, options, submit link, link text, category forms
      'hero-loan': 5,
    }],
  },
};
