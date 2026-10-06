export type InspectionStatus = 'checked' | 'follow_up' | 'not_checked';
export interface Vehicle {
  id: string; plateNumber: string; makeModel: string; year: string;
  chassisNumber: string; engineNumber: string; sellerName: string;
  inspectionDate: string; createdAt: string; isSample?: boolean;
}
export interface InspectionItem {
  id: string; vehicleId: string; itemName: string; status: InspectionStatus;
  note: string; source: string; evidenceFileName: string; updatedAt: string;
}
export interface Store { schemaVersion: 1; vehicles: Vehicle[]; items: InspectionItem[] }
export type VehicleInput = Partial<Omit<Vehicle, 'id' | 'createdAt'>> & { makeModel: string; inspectionDate: string };
export const STORAGE_KEY = 'vehicle-inspection-mvp:v1';
export const CHECKLIST = [
  'ตรวจเอกสารทะเบียนและข้อมูลผู้ขาย',
  'เปรียบเทียบทะเบียนและข้อมูลรถกับเอกสาร',
  'เปรียบเทียบเลขตัวถังกับเอกสาร',
  'เปรียบเทียบเลขเครื่องกับเอกสาร',
  'รวบรวมประวัติซ่อมหรือบริการจากแหล่งที่ผู้ขายให้',
  'ตรวจโครงสร้าง ตัวถัง และร่องรอยซ่อม',
  'ตรวจร่องรอยน้ำหรือความชื้นผิดปกติ',
  'ตรวจการทำงานและทดลองขับโดยผู้ตรวจ',
] as const;
export const STATUS_LABEL: Record<InspectionStatus, string> = {
  checked: 'ตรวจแล้ว', follow_up: 'ต้องตรวจเพิ่ม', not_checked: 'ยังไม่ได้ตรวจ',
};
export const DISCLAIMER = 'ข้อมูลนี้เป็นบันทึกประกอบการพิจารณา ไม่ใช่การยืนยันประวัติหรือรับรองสภาพรถ';
export const emptyStore = (): Store => ({ schemaVersion: 1, vehicles: [], items: [] });
export function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function createVehicle(input: VehicleInput): { vehicle: Vehicle; items: InspectionItem[] } {
  if (!input.makeModel.trim() || !validDate(input.inspectionDate)) throw new Error('กรอกรุ่นรถและวันที่ตรวจให้ครบ');
  const vehicle: Vehicle = {
    id: crypto.randomUUID(), plateNumber: (input.plateNumber ?? '').trim(),
    makeModel: input.makeModel.trim(), year: (input.year ?? '').trim(),
    chassisNumber: (input.chassisNumber ?? '').trim(), engineNumber: (input.engineNumber ?? '').trim(),
    sellerName: (input.sellerName ?? '').trim(), inspectionDate: input.inspectionDate,
    createdAt: new Date().toISOString(), ...(input.isSample ? { isSample: true } : {}),
  };
  return { vehicle, items: CHECKLIST.map(itemName => ({
    id: crypto.randomUUID(), vehicleId: vehicle.id, itemName, status: 'not_checked',
    note: '', source: '', evidenceFileName: '', updatedAt: new Date().toISOString(),
  })) };
}
export function counts(items: InspectionItem[]): Record<InspectionStatus, number> {
  return items.reduce((result, item) => { result[item.status]++; return result; }, { checked: 0, follow_up: 0, not_checked: 0 });
}
export function pendingItems(items: InspectionItem[]): InspectionItem[] {
  return [...items.filter(x => x.status === 'follow_up'), ...items.filter(x => x.status === 'not_checked')];
}
export function reportNote(note: string): string {
  const chars = Array.from(note.replace(/\s+/g, ' ').trim());
  return chars.length > 100 ? chars.slice(0, 100).join('') + '… (ย่อ)' : chars.join('');
}
export function reportShort(value: string, limit = 40): string {
  const chars = Array.from(value.replace(/\s+/g, ' ').trim());
  return chars.length > limit ? chars.slice(0, limit).join('') + '… (ย่อ)' : chars.join('');
}
export function validateEvidence(file: { name: string; type: string; size: number }): string | null {
  const matches = { 'image/jpeg': /\.jpe?g$/i, 'image/png': /\.png$/i, 'application/pdf': /\.pdf$/i };
  const extension = matches[file.type as keyof typeof matches];
  if (!extension || !extension.test(file.name)) return 'รองรับเฉพาะไฟล์ JPG, PNG และ PDF';
  if (file.size > 10 * 1024 * 1024) return 'ไฟล์เกิน 10 MB กรุณาเลือกไฟล์ขนาดเล็กลง';
  if (file.size === 0) return 'ไฟล์ว่าง กรุณาเลือกไฟล์ใหม่';
  return null;
}
type ObjectValue = Record<string, unknown>;
const isObject = (value: unknown): value is ObjectValue => typeof value === 'object' && value !== null && !Array.isArray(value);
const strings = (value: ObjectValue, keys: string[]) => keys.every(key => typeof value[key] === 'string');
export function isStore(value: unknown): value is Store {
  if (!isObject(value) || value.schemaVersion !== 1 || !Array.isArray(value.vehicles) || !Array.isArray(value.items)) return false;
  const vehicles = value.vehicles, items = value.items;
  if (!vehicles.every(v => isObject(v) && strings(v, ['id', 'plateNumber', 'makeModel', 'year', 'chassisNumber', 'engineNumber', 'sellerName', 'inspectionDate', 'createdAt']) && v.id && (v.makeModel as string).trim() && validDate(v.inspectionDate) && (v.isSample === undefined || typeof v.isSample === 'boolean'))) return false;
  const ids = new Set(vehicles.map(v => v.id));
  if (ids.size !== vehicles.length) return false;
  if (!items.every(i => isObject(i) && strings(i, ['id', 'vehicleId', 'itemName', 'note', 'source', 'evidenceFileName', 'updatedAt']) && i.id && ids.has(i.vehicleId) && ['checked', 'follow_up', 'not_checked'].includes(i.status as string))) return false;
  if (new Set(items.map(i => i.id)).size !== items.length) return false;
  return vehicles.every(v => {
    const own = items.filter(i => i.vehicleId === v.id);
    return own.length === CHECKLIST.length && CHECKLIST.every(name => own.filter(i => i.itemName === name).length === 1);
  });
}
export function loadStore(storage: Pick<Storage, 'getItem'>): { ok: true; store: Store } | { ok: false; error: string } {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { ok: true, store: emptyStore() };
    const parsed: unknown = JSON.parse(raw);
    if (!isStore(parsed)) throw new Error('รูปแบบข้อมูลไม่รองรับ');
    return { ok: true, store: parsed };
  } catch {
    return { ok: false, error: 'อ่านข้อมูลที่บันทึกไว้ไม่ได้ กรุณาเปิดเบราว์เซอร์เดิมและตรวจการอนุญาตจัดเก็บข้อมูล ข้อมูลเดิมยังไม่ถูกเขียนทับ' };
  }
}
export function saveStore(storage: Pick<Storage, 'setItem'>, store: Store): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(store));
}
export function sampleStore(): Store {
  const toyota = createVehicle({ makeModel: 'Toyota Hilux Revo', plateNumber: 'ตัวอย่าง 001', year: '2020', sellerName: 'ผู้ขายสมมติ A', inspectionDate: localDate(), isSample: true });
  toyota.items[0] = { ...toyota.items[0], status: 'follow_up', source: 'ผู้ขาย (สมมติ)', note: 'ขอตรวจเอกสารจริงก่อนซื้อ ขณะนี้ดูเฉพาะสำเนาทะเบียน' };
  toyota.items[1] = { ...toyota.items[1], status: 'checked', source: 'ผู้ขาย (สมมติ)', note: 'เปรียบเทียบทะเบียนและรุ่นกับสำเนาที่ได้รับแล้ว บันทึกเฉพาะการตรวจรายการนี้' };
  toyota.items[2] = { ...toyota.items[2], status: 'follow_up', source: 'ช่าง (สมมติ)', note: 'นัดตรวจเลขตัวถังบนรถและเปรียบเทียบกับเอกสาร', evidenceFileName: 'ตัวอย่าง-เลขตัวถัง.jpg' };
  const honda = createVehicle({ makeModel: 'Honda City', plateNumber: 'ตัวอย่าง 002', year: '2022', sellerName: 'ผู้ขายสมมติ B', inspectionDate: localDate(), isSample: true });
  return { schemaVersion: 1, vehicles: [toyota.vehicle, honda.vehicle], items: [...toyota.items, ...honda.items] };
}
