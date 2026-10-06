import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CHECKLIST, createVehicle, counts, pendingItems, reportNote, validateEvidence, loadStore, saveStore, sampleStore, STORAGE_KEY, type Store } from './model.ts';

function expect(actual: unknown) {
  return {
    toBe: (value: unknown) => assert.equal(actual, value),
    toEqual: (value: unknown) => assert.deepEqual(actual, value),
    toHaveLength: (value: number) => assert.equal((actual as unknown[]).length, value),
    toThrow: () => assert.throws(actual as () => void),
    toBeNull: () => assert.equal(actual, null),
    toBeTruthy: () => assert.ok(actual),
    not: {
      toBe: (value: unknown) => assert.notEqual(actual, value),
      toContain: (value: string) => assert.ok(!(actual as string).includes(value)),
    },
  };
}

function memoryStorage(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORAGE_KEY, initial);
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}

describe('inspection workflow', () => {
  it('keeps outstanding work in sample notes as follow-up rather than checked', () => {
    const sample = sampleStore();
    expect(sample.items[0].status).toBe('follow_up');
    expect(sample.items[0].note.startsWith('ขอตรวจเอกสารจริง')).toBe(true);
    expect(counts(sample.items.filter(item => item.vehicleId === sample.vehicles[0].id))).toEqual({ checked: 1, follow_up: 2, not_checked: 5 });
  });
  it('creates eight independent unchecked items and accepts unknown identifiers', () => {
    const a = createVehicle({ makeModel: ' Toyota ', inspectionDate: '2026-10-06' });
    const b = createVehicle({ makeModel: 'Honda', inspectionDate: '2026-10-06' });
    expect(a.vehicle.makeModel).toBe('Toyota');
    expect(a.vehicle.chassisNumber).toBe('');
    expect(a.items).toHaveLength(8);
    expect(CHECKLIST).toHaveLength(8);
    expect(a.items.every(x => x.status === 'not_checked' && x.vehicleId === a.vehicle.id)).toBe(true);
    expect(a.items[0].id).not.toBe(b.items[0].id);
    expect(() => createVehicle({ makeModel: ' ', inspectionDate: '2026-10-06' })).toThrow();
  });
  it('counts separately and puts follow-up before unchecked', () => {
    const { items } = createVehicle({ makeModel: 'Toyota', inspectionDate: '2026-10-06' });
    items[0].status = 'checked'; items[2].status = 'follow_up';
    expect(counts(items)).toEqual({ checked: 1, follow_up: 1, not_checked: 6 });
    expect(pendingItems(items)[0].id).toBe(items[2].id);
    expect(pendingItems(items)).toHaveLength(7);
  });
  it('shortens only paper notes with an explicit marker', () => {
    expect(reportNote('สั้น')).toBe('สั้น');
    expect(reportNote('ก'.repeat(101))).toBe('ก'.repeat(100) + '… (ย่อ)');
  });
  it('accepts JPG/PNG/PDF up to 10MB and rejects unsupported or oversized files', () => {
    expect(validateEvidence({ name: 'photo.jpg', type: 'image/jpeg', size: 10 * 1024 * 1024 })).toBeNull();
    expect(validateEvidence({ name: 'report.pdf', type: 'application/pdf', size: 100 })).toBeNull();
    expect(validateEvidence({ name: 'photo.png', type: 'image/png', size: 10 * 1024 * 1024 + 1 })).toBeTruthy();
    expect(validateEvidence({ name: 'bad.exe', type: 'application/octet-stream', size: 10 })).toBeTruthy();
    expect(validateEvidence({ name: 'bad.svg', type: 'image/svg+xml', size: 10 })).toBeTruthy();
  });
});

describe('persistent storage', () => {
  it('round trips structured data and filenames without file contents', () => {
    const { vehicle, items } = createVehicle({ makeModel: 'Toyota', inspectionDate: '2026-10-06' });
    items[0] = { ...items[0], status: 'follow_up', note: 'ขอเอกสารเพิ่ม', source: 'ผู้ขาย', evidenceFileName: 'book.jpg' };
    const store: Store = { schemaVersion: 1, vehicles: [vehicle], items };
    const storage = memoryStorage(); saveStore(storage, store);
    expect(loadStore(storage)).toEqual({ ok: true, store });
    expect(storage.getItem(STORAGE_KEY)).not.toContain('blob:');
  });
  it('leaves corrupt and incompatible data untouched', () => {
    for (const initial of ['{broken', '{"schemaVersion":2}', '{"schemaVersion":1,"vehicles":[],"items":[{}]}']) {
      const storage = memoryStorage(initial);
      expect(loadStore(storage).ok).toBe(false);
      expect(storage.getItem(STORAGE_KEY)).toBe(initial);
    }
  });
  it('returns empty state on first use and surfaces access or quota errors', () => {
    expect(loadStore(memoryStorage())).toEqual({ ok: true, store: { schemaVersion: 1, vehicles: [], items: [] } });
    expect(loadStore({ getItem: () => { throw new Error('blocked'); } }).ok).toBe(false);
    expect(() => saveStore({ setItem: () => { throw new Error('quota'); } }, { schemaVersion: 1, vehicles: [], items: [] })).toThrow();
  });
});
