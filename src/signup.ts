export interface SignupDraft { name: string; email: string; role: string }
export interface SignupSubmission extends SignupDraft { schemaVersion: 1; submittedAt: string }
export const SIGNUP_KEY = '2cars:signup-demo:v1';

export function validateSignup(draft: SignupDraft): Partial<Record<keyof SignupDraft, string>> {
  const errors: Partial<Record<keyof SignupDraft, string>> = {};
  if (!draft.name.trim()) errors.name = 'กรุณากรอกชื่อที่ต้องการให้เรียก';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.email = 'กรุณากรอกอีเมลให้ครบ เช่น name@example.com';
  if (!draft.role.trim()) errors.role = 'กรุณาระบุบทบาท เช่น ผู้ดูแลเต็นท์ หรือช่าง';
  return errors;
}

export function saveDemoSignup(storage: Pick<Storage, 'setItem'>, draft: SignupDraft): SignupSubmission {
  if (Object.keys(validateSignup(draft)).length) throw new Error('ข้อมูลลงชื่อไม่ครบ');
  const submission: SignupSubmission = {
    schemaVersion: 1, name: draft.name.trim(), email: draft.email.trim().toLowerCase(),
    role: draft.role.trim(), submittedAt: new Date().toISOString(),
  };
  storage.setItem(SIGNUP_KEY, JSON.stringify(submission));
  return submission;
}
