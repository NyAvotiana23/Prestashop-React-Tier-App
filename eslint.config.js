import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
    globalIgnores(['dist']),
    {
        files: ['**/*.{js,jsx}'],
        extends: [
            js.configs.recommended,
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite,
        ],
        languageOptions: {
            globals: globals.browser,
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        rules: {
            // --- Async ---
            "no-async-promise-executor": "error",
            "require-await": "warn",
            "no-return-await": "warn",

            // --- Variables / Typos ---
            "no-undef": "error",              // using undeclared variables
            "no-unused-vars": "warn",         // declared but never used
            "no-use-before-define": "error",  // using var/func before declaring it

            // --- Logic bugs ---
            "eqeqeq": "error",               // forces === instead of ==
            "no-constant-condition": "error", // while(true) / if(true) by accident
            "no-duplicate-case": "error",     // duplicate case in switch
            "no-self-assign": "error",        // x = x
            "no-self-compare": "error",       // x === x
            "no-unreachable": "error",        // code after return/throw
            "no-fallthrough": "error",        // missing break in switch cases
            "array-callback-return": "error", // forgetting return inside .map()/.filter()

            // --- Null safety ---
            "no-unsafe-optional-chaining": "error", // const { a } = obj?.foo  (can be undefined)

            // --- React specific ---
            "react-hooks/rules-of-hooks": "error",   // hooks in wrong place
            "react-hooks/exhaustive-deps": "warn",   // missing useEffect dependencies
        }
    },
])