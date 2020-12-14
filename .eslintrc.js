module.exports = {
  env: {
    node: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.eslint.json',
    projectFolderIgnoreList: [
      '**/new-makers/dummy-data/**'
    ],
    sourceType: 'module'
  },
  plugins: [
    'eslint-plugin-import',
    'eslint-plugin-prefer-arrow',
    'eslint-plugin-no-null',
    'eslint-plugin-unicorn',
    'eslint-plugin-jsdoc',
    '@typescript-eslint',
    '@typescript-eslint/tslint'
  ],
  rules: {
    '@typescript-eslint/adjacent-overload-signatures': 'error',
    '@typescript-eslint/array-type': [
      'error',
      {
        default: 'generic'
      }
    ],
    '@typescript-eslint/consistent-type-assertions': 'error',
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/dot-notation': 'off',
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      {
        accessibility: 'explicit',
        ignoredMethodNames: ['constructor']
      }
    ],
    '@typescript-eslint/member-delimiter-style': [
      'error',
      {
        multiline: {
          delimiter: 'semi',
          requireLast: true
        },
        singleline: {
          delimiter: 'semi',
          requireLast: false
        }
      }
    ],
    '@typescript-eslint/member-ordering': 'error',
    '@typescript-eslint/naming-convention': 'error',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-empty-interface': 'error',
    '@typescript-eslint/no-extraneous-class': 'off',
    '@typescript-eslint/no-inferrable-types': [
      'error',
      {
        ignoreParameters: true
      }
    ],
    '@typescript-eslint/no-misused-new': 'error',
    '@typescript-eslint/no-namespace': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-unused-expressions': 'error',
    '@typescript-eslint/prefer-for-of': 'error',
    '@typescript-eslint/prefer-function-type': 'error',
    '@typescript-eslint/prefer-namespace-keyword': 'error',
    '@typescript-eslint/quotes': [
      'error',
      'single',
      {
        avoidEscape: true
      }
    ],
    '@typescript-eslint/semi': [
      'error',
      'always'
    ],
    '@typescript-eslint/triple-slash-reference': 'error',
    '@typescript-eslint/type-annotation-spacing': 'error',
    '@typescript-eslint/unified-signatures': 'error',
    'arrow-body-style': 'error',
    'arrow-parens': [
      'error',
      'as-needed'
    ],
    'brace-style': [
      'error',
      '1tbs'
    ],
    'class-methods-use-this': 'off',
    'comma-dangle': 'error',
    complexity: [
      'error',
      {
        max: 20
      }
    ],
    'constructor-super': 'error',
    curly: 'off',
    'default-case': 'off',
    'eol-last': 'error',
    eqeqeq: [
      'error',
      'smart'
    ],
    'id-blacklist': 'off',
    'id-match': 'off',
    'import/no-default-export': 'error',
    'import/no-deprecated': 'warn',
    'import/no-extraneous-dependencies': 'off',
    'import/order': 'off',
    'jsdoc/check-alignment': 'error',
    'jsdoc/check-indentation': 'error',
    'jsdoc/newline-after-description': 'error',
    'jsdoc/no-types': 'error',
    'max-len': [
      'error',
      {
        code: 320
      }
    ],
    'max-lines': [
      'error',
      1000
    ],
    'new-parens': 'error',
    'newline-per-chained-call': 'off',
    'no-bitwise': 'error',
    'no-caller': 'error',
    'no-cond-assign': 'error',
    'no-console': [
      'error',
      {
        allow: [
          'log',
          'warn',
          'dir',
          'timeLog',
          'assert',
          'clear',
          'count',
          'countReset',
          'group',
          'groupEnd',
          'table',
          'dirxml',
          'error',
          'groupCollapsed',
          'Console',
          'profile',
          'profileEnd',
          'timeStamp',
          'context'
        ]
      }
    ],
    'no-debugger': 'error',
    'no-duplicate-case': 'error',
    'no-duplicate-imports': 'error',
    'no-empty': 'off',
    'no-eval': 'error',
    'no-fallthrough': 'error',
    'no-invalid-this': 'error',
    'no-multiple-empty-lines': [
      'error',
      {
        max: 1
      }
    ],
    'no-new-wrappers': 'error',
    'no-null/no-null': 'error',
    'no-redeclare': 'error',
    'no-restricted-imports': [
      'error',
      'rxjs/Rx'
    ],
    'no-return-await': 'off',
    'no-shadow': [
      'error',
      {
        hoist: 'all'
      }
    ],
    'no-sparse-arrays': 'error',
    'no-template-curly-in-string': 'error',
    'no-throw-literal': 'error',
    'no-trailing-spaces': 'error',
    'no-undef-init': 'off',
    'no-underscore-dangle': 'off',
    'no-unsafe-finally': 'error',
    'no-unused-labels': 'error',
    'no-var': 'error',
    'object-shorthand': 'off',
    'one-var': [
      'error',
      'never'
    ],
    'padding-line-between-statements': [
      'off',
      {
        blankLine: 'always',
        prev: '*',
        next: 'return'
      }
    ],
    'prefer-const': 'error',
    'prefer-object-spread': 'off',
    'prefer-template': 'error',
    'quote-props': [
      'error',
      'as-needed'
    ],
    radix: 'error',
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'never',
        named: 'never',
        asyncArrow: 'always'
      }
    ],
    'space-in-parens': [
      'error',
      'never'
    ],
    'spaced-comment': [
      'error',
      'always',
      {
        markers: [
          '/'
        ]
      }
    ],
    'unicorn/filename-case': 'error',
    'use-isnan': 'error',
    yoda: 'error',
    '@typescript-eslint/tslint/config': [
      'error',
      {
        rules: {
          encoding: true,
          'import-spacing': true,
          'prefer-conditional-expression': [
            true,
            'check-else-if'
          ],
          'prefer-method-signature': true,
          'prefer-while': true,
          typedef: [
            true,
            'call-signature',
            'parameter',
            'property-declaration',
            'array-destructuring'
          ],
          whitespace: [
            true,
            'check-branch',
            'check-decl',
            'check-operator',
            'check-separator',
            'check-type'
          ]
        }
      }
    ]
  }
};
