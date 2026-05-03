import type { Config } from "stylelint";

const config: Config = {
	extends: ["stylelint-config-standard-scss", "stylelint-config-idiomatic-order"],
	plugins: ["stylelint-scss"],
	overrides: [
		{
			files: ["**/*.scss"],
			customSyntax: "postcss-scss",
		},
	],
	rules: {
		"max-nesting-depth": 3,
		"scss/at-rule-no-unknown": [
			true,
			{
				ignoreAtRules: ["tailwind", "use"],
			},
		],
		"no-descending-specificity": null,
		"value-keyword-case": [
			"lower",
			{
				ignoreKeywords: ["currentColor"],
			},
		],
		"property-no-unknown": [
			true,
			{
				ignoreProperties: ["composes"],
			},
		],
		"selector-pseudo-class-no-unknown": [
			true,
			{
				ignorePseudoClasses: ["global"],
			},
		],
		"scss/dollar-variable-empty-line-before": [
			"always",
			{
				except: ["first-nested"],
				ignore: ["inside-single-line-block", "after-dollar-variable"],
			},
		],
		"custom-property-pattern": [
			"^([a-z][a-z0-9]*)(-{1,}[a-z0-9]+)*$",
			{
				message: (name: string) =>
					`Expected custom property name "${name}" to be kebab-case allowing multiple hyphens.`,
			},
		],
		"scss/operator-no-newline-after": null,
	},
};

export default config;
