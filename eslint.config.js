import pluginJS from "@eslint/js";
import pluginTS from "typescript-eslint";

/** @type {import('eslint').Linter.Config.rules} */
const rules = {
    "@typescript-eslint/no-unused-vars": ["warn", {"argsIgnorePattern": "^_"}],
    "@typescript-eslint/no-explicit-any": "warn"
};

/** @type {import('eslint').Linter.Config[]} */
export default [
    {ignores: ["src/desktop/**/*"]},
    pluginJS.configs.recommended,
    {files: ["**/*.{js,mjs,cjs,ts,tsx}"], rules},
    {files: ["**/*.js"], languageOptions: {sourceType: "script"}, rules},
    ...pluginTS.configs.recommended.map(i => ({...i, rules: {...i.rules, ...rules}}))
];