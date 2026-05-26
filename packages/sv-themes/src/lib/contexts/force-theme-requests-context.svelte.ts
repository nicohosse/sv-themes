import { createContext, untrack } from "svelte";

export interface ForceThemeRequest {
	id: symbol;
	parentId?: symbol;
	forcedTheme?: string;
	priority: number;
	overrideChildren: boolean;
	timestamp: number;
}

export interface ForceThemeRegistry {
	readonly dominantForcedTheme?: string;
	readonly register: (request: Omit<ForceThemeRequest, "timestamp">) => void;
	readonly unregister: (id: symbol) => void;
}

export function createForceThemeRegistry(): ForceThemeRegistry {
	let requests = $state<ForceThemeRequest[]>([]);

	function isBlockedByAncestor(request: ForceThemeRequest, requestMap: Map<symbol, ForceThemeRequest>) {
		let current = request.parentId;

		while (current) {
			const parent = requestMap.get(current);

			if (!parent) break;
			if (parent.overrideChildren) return true;

			current = parent.parentId;
		}

		return false;
	}

	const dominantForcedTheme = $derived.by(() => {
		if (requests.length === 0) return undefined;

		const requestMap = new Map(requests.map((request) => [request?.id, request]));

		const validRequests = requests.filter(
			(request) => request?.forcedTheme && !isBlockedByAncestor(request, requestMap),
		);

		if (validRequests.length === 0) return undefined;

		return validRequests.sort((a, b) => {
			if (a.priority !== b.priority) return b.priority - a.priority;
			return b.timestamp - a.timestamp;
		})[0].forcedTheme;
	});

	return {
		get dominantForcedTheme() {
			return dominantForcedTheme;
		},

		register(request: Omit<ForceThemeRequest, "timestamp">) {
			untrack(() => {
				const index = requests.findIndex((otherRequest) => otherRequest?.id === request.id);
				const timestamp = Date.now();

				if (index >= 0) {
					const existing = requests[index];

					if (
						existing.forcedTheme !== request.forcedTheme ||
						existing.priority !== request.priority ||
						existing.parentId !== request.parentId ||
						existing.overrideChildren !== request.overrideChildren
					)
						requests = requests.map((r, i) => (i === index ? { ...request, timestamp } : r));
				} else requests = [...requests, { ...request, timestamp }];
			});
		},

		unregister(id: symbol) {
			untrack(() => (requests = requests.filter((request) => request?.id !== id)));
		},
	};
}

const [internalGetForceThemeRegistry, internalSetForceThemeRegistry] = createContext<ForceThemeRegistry>();

export const getForceThemeRegistry = () => {
	try {
		return internalGetForceThemeRegistry();
	} catch {
		return undefined;
	}
};

export const setForceThemeRegistry = internalSetForceThemeRegistry;

const [internalGetForceThemeParentId, internalSetForceThemeParentId] = createContext<symbol>();

export const getForceThemeParentId = () => {
	try {
		return internalGetForceThemeParentId();
	} catch {
		return undefined;
	}
};

export const setForceThemeParentId = internalSetForceThemeParentId;
