export class StorageMock implements Storage {
	private store = new Map<string, string>();

	get length(): number {
		return this.store.size;
	}

	clear(): void {
		const hasItems = this.store.size > 0;

		this.store.clear();

		if (hasItems) emitStorageEvent(null, null, null, this);
	}

	getItem(key: string): string | null {
		const stringKey = String(key);
		return this.store.has(stringKey) ? (this.store.get(stringKey) ?? null) : null;
	}

	setItem(key: string, value: string): void {
		const stringKey = String(key);
		const stringValue = String(value);
		const oldValue = this.getItem(stringKey);

		this.store.set(stringKey, stringValue);

		if (oldValue !== stringValue) emitStorageEvent(stringKey, oldValue, stringValue, this);
	}

	removeItem(key: string): void {
		const stringKey = String(key);
		const oldValue = this.getItem(stringKey);

		if (oldValue === null) return;

		this.store.delete(stringKey);

		emitStorageEvent(stringKey, oldValue, null, this);
	}

	key(index: number): string | null {
		const keys = Array.from(this.store.keys());
		return keys[index] ?? null;
	}
}

export function emitStorageEvent(
	key?: string | null,
	oldValue?: string | null,
	newValue?: string | null,
	storageArea = globalThis.localStorage,
) {
	const event = new StorageEvent("storage", {
		key,
		newValue,
		oldValue,
	});

	Object.defineProperty(event, "storageArea", {
		value: storageArea,
	});

	globalThis.dispatchEvent(event);
}
