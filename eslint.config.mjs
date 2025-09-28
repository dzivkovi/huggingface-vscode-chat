/**
 * ESLint configuration for the project.
 *
 * See https://eslint.style and https://typescript-eslint.io for additional linting options.
 */
// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
	{
		ignores: [
			'.vscode-test',
			'out',
			'**/*.d.ts',
			'scripts/**/*.js', // Scripts don't need strict linting
			'**/*.test.ts' // Tests can be more relaxed
		]
	},
	{
		files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
		languageOptions: {
			globals: {
				// Node.js globals
				console: 'readonly',
				process: 'readonly',
				module: 'readonly',
				require: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly',
				exports: 'readonly',
				Buffer: 'readonly',
				global: 'readonly',
				// VS Code extension globals
				acquireVsCodeApi: 'readonly',
				// Browser/Web API globals (VS Code extensions run in Electron)
				fetch: 'readonly',
				URL: 'readonly',
				URLSearchParams: 'readonly',
				AbortController: 'readonly',
				AbortSignal: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				setInterval: 'readonly',
				clearInterval: 'readonly',
				ReadableStream: 'readonly',
				TextDecoder: 'readonly',
				TextEncoder: 'readonly'
			}
		}
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.stylistic,
	{
		plugins: {
			'@stylistic': stylistic
		},
		rules: {
			// ========== FORMATTING (like Ruff's formatter) ==========
			'curly': 'warn',
			'@stylistic/semi': ['warn', 'always'],

			// ========== UNUSED CODE (like Ruff's F401, F841) ==========
			'@typescript-eslint/no-unused-vars': [
				'warn', // Changed from 'error' to 'warn' - more pragmatic like Ruff
				{
					'argsIgnorePattern': '^_',
					'varsIgnorePattern': '^_',
					'caughtErrorsIgnorePattern': '^_', // Added: ignore caught errors with _
					'destructuredArrayIgnorePattern': '^_' // Added: ignore array destructuring with _
				}
			],

			// ========== TYPESCRIPT PRAGMATIC RULES ==========
			// These are OFF because they're not critical for functionality
			'@typescript-eslint/no-explicit-any': 'off', // Real-world code needs 'any' sometimes
			'@typescript-eslint/no-require-imports': 'off', // Allow require() in JS files
			'@typescript-eslint/consistent-generic-constructors': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/array-type': 'off',
			'@typescript-eslint/prefer-nullish-coalescing': 'off', // ?? vs || is developer preference
			'@typescript-eslint/no-non-null-assertion': 'off', // Allow ! operator when developer knows better

			// ========== NAMING CONVENTIONS ==========
			'@typescript-eslint/naming-convention': [
				'warn',
				{
					'selector': 'import',
					'format': ['camelCase', 'PascalCase']
				}
			],

			// ========== ACTUAL BUG PREVENTION (like Ruff's E, W categories) ==========
			'no-undef': 'error', // Undefined variable usage
			'no-unused-expressions': 'warn', // Changed to warn - sometimes valid in testing
			'eqeqeq': ['warn', 'smart'], // Use === but allow == for null checks (x == null checks both null and undefined)
			'no-constant-condition': 'warn', // Avoid if(true) or while(false)
			'no-debugger': 'warn', // Don't leave debugger statements
			'no-unreachable': 'error', // Code after return/throw/break

			// ========== ALLOWED IN DEVELOPMENT ==========
			'no-console': 'off', // Console is needed for VS Code extension debugging

			// ========== VS CODE EXTENSION SPECIFIC ==========
			'@typescript-eslint/no-floating-promises': 'off', // VS Code extension APIs often don't need await
			'@typescript-eslint/no-misused-promises': 'off' // VS Code event handlers can be async
		}
	}
);