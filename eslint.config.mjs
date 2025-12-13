import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
	eslint.configs.recommended,
	tseslint.configs.recommended,
	prettier,
	{
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
				...globals.serviceworker
			}
		}
	},
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "off"
		}
	}
);
