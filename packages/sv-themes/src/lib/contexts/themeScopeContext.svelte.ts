import { createContext } from "svelte";

export interface ThemeScopeContextValue {
	id: symbol;
	depth: number;
}

const [internalGetThemeScopeContext, internalSetThemeScopeContext] = createContext<ThemeScopeContextValue>();

export const getThemeScopeContext = (): ThemeScopeContextValue | undefined => {
	try {
		return internalGetThemeScopeContext();
	} catch {
		return undefined;
	}
};

export const setThemeScopeContext = internalSetThemeScopeContext;
