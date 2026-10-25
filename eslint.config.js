import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

const typescriptFiles = ["**/*.ts"];

export default tseslint.config(
  {
    ignores: ["coverage/**", "dist/**", "src/generated/**"]
  },
  {
    ...eslint.configs.recommended,
    files: ["**/*.js"],
    languageOptions: {
      globals: globals.node
    }
  },
  ...tseslint.configs.recommendedTypeChecked.map((configuration) => ({
    ...configuration,
    files: typescriptFiles
  })),
  {
    files: typescriptFiles,
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: {
          allowDefaultProject: ["prisma.config.ts"]
        },
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            arguments: false
          }
        }
      ]
    }
  },
  eslintConfigPrettier
);
