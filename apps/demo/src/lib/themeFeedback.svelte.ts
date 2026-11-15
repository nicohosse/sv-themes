import type { ThemeManagerError } from "sv-themes";

class ThemeFeedback {
	error = $state<ThemeManagerError>();

	report(error: ThemeManagerError) {
		this.error = error;
	}

	clear() {
		this.error = undefined;
	}
}

export const themeFeedback = new ThemeFeedback();
