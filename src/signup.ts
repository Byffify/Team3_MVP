export interface SignupDraft { name: string; email: string; extra: string }
const WEBHOOK_URL = 'https://hook.eu1.make.com/2d3dgil2ojj3mtwifsa5cwxco4nzmyl4';
export const SIGNUP_SUCCESS = 'ส่งคำขอแล้ว ขอบคุณ! หากไม่เห็นอีเมล กรุณาตรวจสอบ Spam';
export const SIGNUP_FAILURE = 'ส่งไม่สำเร็จ กรุณาลองอีกครั้ง';

export function validateSignup(draft: SignupDraft): Partial<Record<keyof SignupDraft, string>> {
  const errors: Partial<Record<keyof SignupDraft, string>> = {};
  if (!draft.name.trim()) errors.name = 'กรุณากรอกชื่อที่ต้องการให้เรียก';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.email = 'กรุณากรอกอีเมลให้ครบ เช่น name@example.com';
  if (!draft.extra.trim()) errors.extra = 'กรุณาระบุบทบาท เช่น ผู้ดูแลเต็นท์ หรือช่าง';
  return errors;
}

export async function submitSignup(draft: SignupDraft, fetcher: typeof fetch = fetch): Promise<void> {
  if (Object.keys(validateSignup(draft)).length) throw new Error('ข้อมูลลงชื่อไม่ครบ');
  await fetcher(WEBHOOK_URL, {
    method: 'POST', mode: 'no-cors',
    body: new URLSearchParams({ name: draft.name.trim(), email: draft.email.trim().toLowerCase(), extra: draft.extra.trim() }),
  });
  // no-cors responses are opaque. Do not read status, ok, or response body.
}
