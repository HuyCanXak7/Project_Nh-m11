// Catch runtime hazards in existing browser scripts without imposing a new formatting style.
export default [{
    files: ['frontend/assets/js/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script' },
    rules: {
        'constructor-super': 'error', 'no-async-promise-executor': 'error',
        'no-compare-neg-zero': 'error', 'no-cond-assign': ['error', 'always'],
        'no-constant-binary-expression': 'error', 'no-dupe-args': 'error',
        'no-dupe-else-if': 'error', 'no-dupe-keys': 'error',
        'no-duplicate-case': 'error', 'no-empty-character-class': 'error',
        'no-ex-assign': 'error', 'no-func-assign': 'error',
        'no-import-assign': 'error', 'no-invalid-regexp': 'error',
        'no-new-native-nonconstructor': 'error', 'no-obj-calls': 'error',
        'no-promise-executor-return': 'error', 'no-self-assign': 'error',
        'no-setter-return': 'error', 'no-sparse-arrays': 'error',
        'no-this-before-super': 'error', 'no-unexpected-multiline': 'error',
        'no-unreachable': 'error', 'no-unsafe-finally': 'error',
        'no-unsafe-negation': 'error', 'valid-typeof': 'error',
    },
}];
