const antfu = require('@antfu/eslint-config').default

module.exports = antfu({
  gitignore: true,
  stylistic: true,
  typescript: true,
  yaml: true,
  toml: true,
  markdown: true,
  rules: {
    'antfu/consistent-list-newline': 'off',
    'style/brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'ts/consistent-type-definitions': ['error', 'type'],
    // 'ts/consistent-type-imports': 'off',
    'curly': ['error', 'all'],
    'node/prefer-global/process': 'off',
    'no-console': 'off',
  },
})
