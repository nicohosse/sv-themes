import { createContext } from "svelte";

const [internalGetForceThemeParentId, internalSetForceThemeParentId] = createContext<symbol>();

export const getForceThemeParentId = () => {
	try {
		return internalGetForceThemeParentId();
	} catch {
		return undefined;
	}
};

export const setForceThemeParentId = internalSetForceThemeParentId;
