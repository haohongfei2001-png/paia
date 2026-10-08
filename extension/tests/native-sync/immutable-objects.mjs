// Synthetic provider-neutral bytes only. No network, filesystem, credentials,
// mutable aliasing, listing shortcut, or access to another device's database.
export class ImmutableObjects {
  #objects = new Map();
  constructor(entries = []) {
    for (const [id, value] of entries) this.#objects.set(id, Uint8Array.from(value));
  }
  async putImmutable(ref, value) {
    const previous = this.#objects.get(ref.id);
    if (previous && (previous.length !== value.length || previous.some((byte, i) => byte !== value[i]))) {
      throw new Error('SYNTHETIC_IMMUTABLE_COLLISION');
    }
    this.#objects.set(ref.id, value.slice());
  }
  async get(ref) {
    const value = this.#objects.get(ref.id);
    if (!value) throw new Error('SYNTHETIC_OBJECT_MISSING');
    return value.slice();
  }
  entries() { return [...this.#objects].map(([id, value]) => [id, [...value]]); }
}
