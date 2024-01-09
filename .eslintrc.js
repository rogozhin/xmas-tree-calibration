module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
  extends: [
    '@rogozhin/eslint-config-backend',
    'plugin:prettier/recommended',
  ],
  overrides: [
    {
      files: ['*'],
      rules: {
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-shadow': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        'import/no-cycle': 'off',
        'no-return-assign': 'off',
      },
    },
    {
      files: ['static/*'],
      env: {
        node: false,
        browser: true,
      }
    }
  ],
  env: {
    node: true,
    es2020: true,
  },
};
