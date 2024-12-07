import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default {
  ignores: ['dist'], // Ignore the `dist` directory
  extends: [js.configs.recommended], // Standard JavaScript rules
  files: ['**/*.{js,jsx}'], // Match only JavaScript files
  languageOptions: {
    ecmaVersion: 2020, // Use ECMAScript 2020 syntax
    globals: globals.browser, // Include browser-specific globals
  },
  plugins: {
    'react-hooks': reactHooks,
    'react-refresh': reactRefresh,
  },
  rules: {
    ...reactHooks.configs.recommended.rules, // Include React Hooks rules
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
