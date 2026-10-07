module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react/jsx-runtime', 'plugin:react-hooks/recommended'],
  ignorePatterns: ['out', 'dist', 'node_modules'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  // exhaustive-deps : la convention front (CLAUDE.md) définit les fetchs hors du useEffect et les appelle dedans avec des deps explicites
  rules: { 'react/prop-types': 'off', 'react-hooks/exhaustive-deps': 'off' }
}
