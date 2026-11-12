import { createContext } from "svelte";

export interface ForceThemeParentContext {
	id: symbol;
	depth: number;
}

const [internalGetForceThemeContext, internalSetForceThemeContext] = createContext<ForceThemeParentContext>();

export const getForceThemeContext = (): ForceThemeParentContext | undefined => {
	try {
		return internalGetForceThemeContext();
	} catch {
		return undefined;
	}
};

export const setForceThemeContext = internalSetForceThemeContext;
