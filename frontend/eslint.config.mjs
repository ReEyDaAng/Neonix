// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';
import jsdoc from 'eslint-plugin-jsdoc';

import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),

  ...storybook.configs['flat/recommended'],

  {
    plugins: {
      jsdoc,
    },
    rules: {
      'react/no-unescaped-entities': 'off',

      'jsdoc/check-tag-names': 'warn',
      'jsdoc/check-param-names': 'warn',
      'jsdoc/require-param': 'warn',
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-returns': 'warn',
      'jsdoc/require-returns-description': 'warn',
      'jsdoc/require-jsdoc': [
        'warn',
        {
          contexts: [
            'ClassDeclaration',
            'MethodDefinition',
            'FunctionDeclaration',
            'TSMethodSignature',
            'TSInterfaceDeclaration',
          ],
          publicOnly: true,
        },
      ],
    },
  },

  {
    files: ['src/stories/**/*.{ts,tsx}', '.storybook/**/*.{ts,tsx}'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-description': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
]);

export default eslintConfig;