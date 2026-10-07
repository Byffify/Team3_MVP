import { useEffect, useRef, useState, type FormEvent } from 'react';
import { submitSignup, validateSignup, SIGNUP_SUCCESS, SIGNUP_FAILURE, type SignupDraft } from './signup';
import './landing.css';

function LandingIcon({ name, size = 24 }: { name: 'car' | 'checklist' | 'evidence' | 'report' | 'arrow'; size?: number }) {
  const paths = {
    car: <><path d="m5 7 2-4h10l2 4M3 9h18v8H3zM6 17v3m12-3v3M6 12h2m8 0h2M5 7h14" /></>,
    checklist: <><path d="M9 6h11M9 12h11M9 18h11M3 6l1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2" /></>,
    evidence: <><path d="M14 3H5v18h14V8zM14 3v5h5" /><path d="m8 17 3-4 2 2 2-3 2 5M8 10h1" /></>,
    report: <><path d="M6 3h12v18H6zM9 7h6M9 11h6M9 15h3" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const problems = [
  { title: 'รถสวมซากเป็นเรื่องที่ตรวจสอบได้ยาก', text: 'ผู้ให้สัมภาษณ์ระบุว่ารถสวมซากเป็นปัญหาที่เจ็บที่สุด และตรวจสอบได้ยาก' },
  { title: 'ต้องตรวจสภาพและค้นประวัติประกอบกัน', text: 'ผู้ให้สัมภาษณ์ตรวจรถตามมาตรฐานบริษัท เปิดให้ตรวจศูนย์หรือพาช่างมาดู และใช้การค้นประวัติจากเลขทะเบียนเป็นวิธีหนึ่ง' },
  { title: 'ไม่ต้องการเพิ่มค่าใช้จ่ายกับเครื่องมือใหม่', text: 'ผู้ให้สัมภาษณ์ไม่ต้องการเพิ่มค่าใช้จ่ายสำหรับเครื่องมือหรือบริการใหม่' },
];
const benefits = [
  { icon: 'checklist' as const, title: 'เห็นรายการที่ยังขาด', text: 'แยกสิ่งที่ตรวจแล้ว ต้องตรวจเพิ่ม และยังไม่ได้ตรวจ ให้ทีมรู้ว่าต้องติดตามเรื่องไหนต่อ' },
  { icon: 'evidence' as const, title: 'เก็บข้อมูลและแหล่งหลักฐาน', text: 'บันทึกหมายเหตุ แหล่งข้อมูล และชื่อไฟล์หลักฐาน ไฟล์จริงดูได้เฉพาะรอบที่แนบ ต้องแนบใหม่หลังรีโหลดหรือเปิดแอปใหม่' },
  { icon: 'report' as const, title: 'ทบทวนผ่านรายงานหนึ่งหน้า', text: 'รวมข้อมูลรถ สถานะ และหมายเหตุเป็นรายงาน A4 สำหรับพิมพ์หรือบันทึก PDF' },
];
const steps = [
  { title: 'บันทึกรถที่กำลังพิจารณา', text: 'เริ่มจากรุ่นและวันที่ตรวจ ข้อมูลที่ยังไม่ทราบกลับมาเติมภายหลังได้' },
  { title: 'ตรวจรายการและแนบหลักฐาน', text: 'เลือกสถานะ บันทึกสิ่งที่พบหรือสิ่งที่ต้องติดตาม แล้วระบุแหล่งข้อมูล' },
  { title: 'ทบทวนสิ่งที่ค้างแล้วสร้างรายงาน', text: 'ดูรายการที่ยังไม่ครบก่อนตัดสินใจ และส่งต่อรายงานให้ทีมทบทวน' },
];
const faqs = [
  { question: '2Cars ยืนยันประวัติรถสวมซากได้ไหม?', answer: 'ไม่ได้ 2Cars ช่วยบันทึกข้อมูลและติดตามการตรวจของทีม ไม่ตรวจประวัติรถอัตโนมัติ ไม่เชื่อมฐานข้อมูลทางการ ไม่ยืนยันรถสวมซาก และไม่รับรองสภาพหรือความปลอดภัยของรถ' },
  { question: 'ทดลองฟรี ต้องสมัครสมาชิกก่อนหรือเปล่า?', answer: 'ต้นแบบนี้ทดลองฟรีและเปิดแอปได้โดยไม่ต้องมีบัญชี ฟอร์มลงชื่อรอใช้แยกจากการทดลองแอป ไม่จำเป็นต้องกรอกก่อนทดลองแอป' },
  { question: 'ข้อมูลรถเก็บที่ไหน ทีมเปิดดูจากเครื่องอื่นได้ไหม?', answer: 'ข้อมูลอยู่ในเบราว์เซอร์เดิมบนอุปกรณ์เดิม ไม่มีการซิงก์ข้ามเครื่อง รุ่นทดลองนี้เหมาะกับการใช้เครื่องร่วมกันและส่งต่อรายงานให้ทีม' },
  { question: 'รูปและไฟล์หลักฐานยังอยู่หลังปิดแอปไหม?', answer: 'ชื่อไฟล์ หมายเหตุ และแหล่งข้อมูลจะบันทึกไว้ แต่ไฟล์จริงดูได้เฉพาะรอบที่แนบ เมื่อรีโหลดหรือเปิดแอปใหม่ต้องแนบไฟล์อีกครั้งเพื่อเปิดดู' },
  { question: 'รายงานส่งต่อให้ทีมได้อย่างไร?', answer: 'เปิดรายงานแล้วพิมพ์หรือบันทึกเป็น PDF ขนาด A4 หนึ่งหน้า รายงานแสดงชื่อหลักฐาน ไม่ได้ฝังไฟล์จริง และสถานะ “ตรวจแล้ว” ไม่ได้หมายถึงผ่านหรือปลอดภัย' },
];

function WaitlistSignup() {
  const [draft, setDraft] = useState<SignupDraft>({ name: '', email: '', extra: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof SignupDraft, string>>>({});
  const [failure, setFailure] = useState('');
  const [submission, setSubmission] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const sending = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const confirmationTitle = useRef<HTMLHeadingElement>(null);
  const hadSubmission = useRef(false);
  useEffect(() => {
    if (submission) confirmationTitle.current?.focus();
    else if (hadSubmission.current) form.current?.querySelector<HTMLInputElement>('input')?.focus();
    hadSubmission.current = !!submission;
  }, [submission]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending.current) return;
    setFailure('');
    const validation = validateSignup(draft);
    setErrors(validation);
    if (Object.keys(validation).length) {
      form.current?.querySelector<HTMLInputElement>(`[name="${Object.keys(validation)[0]}"]`)?.focus();
      return;
    }
    sending.current = true;
    setIsSending(true);
    try { await submitSignup(draft); setSubmission(true); }
    catch { setFailure(SIGNUP_FAILURE); }
    finally { sending.current = false; setIsSending(false); }
  }
  const fields: { key: keyof SignupDraft; label: string; placeholder: string; type: string; autoComplete?: string }[] = [
    { key: 'name', label: 'ชื่อ', placeholder: 'ชื่อที่ต้องการให้เรียก', type: 'text', autoComplete: 'name' },
    { key: 'email', label: 'อีเมล', placeholder: 'name@example.com', type: 'email', autoComplete: 'email' },
    { key: 'extra', label: 'คุณเกี่ยวข้องกับการซื้อรถในบทบาทใด?', placeholder: 'เช่น ผู้ดูแลเต็นท์ เจ้าของเต็นท์ หรือช่าง', type: 'text' },
  ];
  return <div className="signup-panel">
    <p className="landing-sr-only" role="status" aria-live="polite">{submission ? SIGNUP_SUCCESS : isSending ? 'กำลังส่งคำขอ…' : ''}</p>
    {submission ? <div className="signup-confirmation"><span className="signup-success-icon"><LandingIcon name="checklist" size={32} /></span><h3 id="signup-confirmation-title" tabIndex={-1} ref={confirmationTitle}>ส่งคำขอแล้ว</h3><p>{SIGNUP_SUCCESS}</p><a className="landing-button" href="/app.html">เริ่มทดลองแอป<LandingIcon name="arrow" size={18} /></a><button className="landing-text-button" onClick={() => setSubmission(false)}>แก้ไขข้อมูลลงชื่อ</button></div> : <form ref={form} onSubmit={submit} noValidate aria-label="ฟอร์มลงชื่อรอใช้" aria-busy={isSending}>
      {fields.map(field => <label key={field.key} htmlFor={`signup-${field.key}`}>{field.label}<input id={`signup-${field.key}`} name={field.key} type={field.type} autoComplete={field.autoComplete} required disabled={isSending} maxLength={field.key === 'email' ? 254 : 120} value={draft[field.key]} placeholder={field.placeholder} aria-invalid={!!errors[field.key]} aria-describedby={errors[field.key] ? `signup-error-${field.key}` : undefined} onChange={event => { setDraft({ ...draft, [field.key]: event.target.value }); setErrors({ ...errors, [field.key]: undefined }); }} />{errors[field.key] && <span className="signup-field-error" id={`signup-error-${field.key}`}>{errors[field.key]}</span>}</label>)}
      <p className="signup-privacy">ชื่อ อีเมล และบทบาทจะถูกส่งเพื่อขอลงชื่อรอใช้ ไม่บันทึกข้อมูลลงชื่อไว้ในเบราว์เซอร์</p>
      {failure && <p className="signup-field-error" role="alert">{failure}</p>}
      <button className="landing-button" type="submit" disabled={isSending}>{isSending ? 'กำลังส่งคำขอ…' : 'ลงชื่อรอใช้'}<LandingIcon name="arrow" size={18} /></button>
    </form>}
  </div>;
}

export default function Landing() {
  return <div className="landing">
    <a className="landing-skip" href="#landing-main">ข้ามไปเนื้อหา</a>
    <header className="landing-header"><div className="landing-container landing-nav"><a className="landing-brand" href="/" aria-label="2Cars หน้าหลัก"><span className="landing-brand-mark"><LandingIcon name="car" size={27} /></span><span>2Cars</span></a><nav aria-label="เมนูหน้าแนะนำ"><a href="#how-it-works">วิธีใช้งาน</a><a href="#faq">คำถามที่พบบ่อย</a><a className="landing-nav-trial" href="/app.html">ลองใช้ฟรี<LandingIcon name="arrow" size={16} /></a></nav></div></header>
    <main id="landing-main">
      <section className="landing-hero landing-container" id="hero" aria-labelledby="hero-title">
        <div className="landing-hero-copy"><h1 id="hero-title"><span>บันทึกการตรวจรถมือสอง</span>{' '}<span>เห็นรายการที่ต้องติดตามก่อนรับซื้อ</span></h1><p className="landing-hero-description">เว็บต้นแบบสำหรับเจ้าของและผู้ดูแลเต็นท์รถมือสอง บันทึกเช็กลิสต์ หมายเหตุ และแหล่งหลักฐาน พร้อมทบทวนรายการที่ต้องติดตามก่อนรับซื้อรถ</p><div className="landing-hero-actions"><a className="landing-button" href="/app.html">ลองใช้ฟรี<LandingIcon name="arrow" size={19} /></a><a className="landing-secondary-link" href="#how-it-works">ดูวิธีใช้งาน</a></div><p className="landing-trial-note">ทดลองต้นแบบได้ทันที ไม่ต้องมีบัญชีผู้ใช้</p><p className="landing-hero-limit">ช่วยจัดบันทึกการตรวจ ไม่ใช่การยืนยันประวัติหรือรับรองสภาพรถ</p></div>
        <figure className="landing-app-preview"><div className="preview-topbar"><span className="preview-window-marks" aria-hidden="true"><i /><i /><i /></span><span>พื้นที่บันทึกก่อนซื้อรถ</span><span className="preview-sample-label">ข้อมูลตัวอย่าง</span></div><img src="/images/app-preview.png" width="1440" height="1000" fetchPriority="high" alt="ภาพหน้าจอแอปต้นแบบ แสดงรถ Toyota และ Honda สมมติ พร้อมจำนวนรายการตรวจแล้ว ต้องตรวจเพิ่ม และยังไม่ได้ตรวจ" /><figcaption>ภาพหน้าจอแอปจริง · ข้อมูลรถสมมติสำหรับทดลอง</figcaption></figure>
      </section>

      <section className="landing-problems landing-container" id="problems" aria-labelledby="problems-title"><div className="landing-section-intro"><h2 id="problems-title">สิ่งที่ได้ยินจากผู้ประกอบการเต็นท์รถ</h2><p>ประเด็นจากบทสัมภาษณ์ผู้ประกอบการ 1 คน ใช้เป็นสมมติฐานสำหรับทดสอบต้นแบบ</p><small>เรียบเรียงจากสรุปบทสัมภาษณ์ที่ได้รับ ไม่ใช่คำพูดถอดเทปหรือข้อสรุปแทนตลาดทั้งหมด</small></div><ul className="problem-list">{problems.map(problem => <li key={problem.title}><h3>{problem.title}</h3><p>{problem.text}</p></li>)}</ul></section>

      <section className="landing-solutions" id="solutions" aria-labelledby="solutions-title"><div className="landing-container"><div className="landing-solutions-heading"><h2 id="solutions-title">รวมสิ่งที่ทีมตรวจ<br />ให้ทบทวนต่อได้ง่ายขึ้น</h2><p>2Cars ช่วยจัดข้อมูลที่คุณมี และทำให้รายการที่ยังต้องติดตามเห็นชัดขึ้น</p></div><div className="benefit-grid">{benefits.map(benefit => <div className="benefit" key={benefit.title}><LandingIcon name={benefit.icon} size={32} /><h3>{benefit.title}</h3><p>{benefit.text}</p></div>)}</div><p className="landing-solution-limit">การตรวจประวัติและสภาพรถยังต้องอาศัยหลักฐานและผู้ตรวจ ระบบไม่ได้เชื่อมฐานข้อมูลทางการ</p></div></section>

      <section className="landing-how landing-container" id="how-it-works" aria-labelledby="how-title"><div className="landing-section-heading"><h2 id="how-title">เริ่มจากรถหนึ่งคัน<br />แล้วค่อยเก็บข้อมูลให้ครบ</h2><a className="landing-secondary-link" href="/app.html">เปิดแอปทดลอง<LandingIcon name="arrow" size={17} /></a></div><ol className="steps-list">{steps.map((step, index) => <li key={step.title}><span className="step-number" aria-hidden="true">{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol></section>

      <section className="landing-signup" id="signup" aria-labelledby="signup-title"><div className="landing-container signup-layout"><div className="signup-intro"><h2 id="signup-title">ลงชื่อรอใช้<br />2Cars</h2><p>กรอกชื่อ อีเมล และบทบาทที่เกี่ยวข้องกับการซื้อรถ เพื่อส่งคำขอลงชื่อรอใช้</p><div className="signup-demo-note"><LandingIcon name="evidence" /><p>ข้อมูลในฟอร์มจะถูกส่งไปยังระบบรับคำขอ กรุณาใช้อีเมลที่ต้องการรับการติดต่อ</p></div><p className="signup-optional">เปิดแอปได้โดยไม่ต้องกรอกฟอร์มนี้</p></div><WaitlistSignup /></div></section>

      <section className="landing-faq landing-container" id="faq" aria-labelledby="faq-title"><h2 id="faq-title">ก่อนลองใช้<br />มีเรื่องไหนที่อยากรู้?</h2><div className="faq-list">{faqs.map(faq => <details key={faq.question}><summary>{faq.question}<span className="faq-expand" aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div></section>
    </main>
    <footer className="landing-footer" id="contact"><div className="landing-container"><div className="footer-top"><div><a className="landing-brand" href="/"><span className="landing-brand-mark"><LandingIcon name="car" size={25} /></span><span>2Cars</span></a><p>ทีมพัฒนา 2Cars<br />ต้นแบบเครื่องมือบันทึกการตรวจรถก่อนซื้อ</p></div><div className="footer-links"><a href="/app.html">ทดลองแอป</a><a href="#signup">ฟอร์มลงชื่อรอใช้</a><a href="#faq">คำถามที่พบบ่อย</a><p>หน้านี้ยังไม่มีช่องทางติดต่อทีมโดยตรง<br />ลงชื่อรอใช้ผ่านฟอร์มด้านบน</p></div></div><div className="footer-bottom"><span>2Cars · {new Date().getFullYear()}</span><span>บันทึกเพื่อประกอบการพิจารณา ไม่ยืนยันประวัติรถ</span></div></div></footer>
  </div>;
}
