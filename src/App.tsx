import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  CHECKLIST, DISCLAIMER, STATUS_LABEL, counts, createVehicle, emptyStore, loadStore,
  localDate, pendingItems, reportNote, reportShort, sampleStore, saveStore, validateEvidence,
  type InspectionItem, type InspectionStatus, type Store, type Vehicle, type VehicleInput,
} from './model';

type View = 'list' | 'new' | 'edit' | 'checklist' | 'summary' | 'report';
type Route = { view: View; vehicleId?: string };
type Evidence = { url: string; type: string; name: string };
function readRoute(): Route {
  const parts = location.hash.slice(1).split('/');
  if (parts[0] === 'new') return { view: 'new' };
  if (parts[0] === 'vehicle' && parts[1] && ['edit', 'checklist', 'summary', 'report'].includes(parts[2])) {
    return { view: parts[2] as View, vehicleId: parts[1] };
  }
  return { view: 'list' };
}
function readInitial() {
  try { return loadStore(window.localStorage); }
  catch { return { ok: false as const, error: 'อ่านข้อมูลไม่ได้ เบราว์เซอร์ไม่อนุญาตให้จัดเก็บข้อมูล กรุณาตรวจการตั้งค่า' }; }
}
function Icon({ name, size = 20 }: { name: 'car' | 'plus' | 'list' | 'check' | 'arrow' | 'file' | 'print' | 'upload' | 'search'; size?: number }) {
  const paths: Record<typeof name, ReactNode> = {
    car: <><path d="m5 7 2-4h10l2 4M3 9h18v8H3zM6 17v3m12-3v3M6 12h2m8 0h2M5 7h14" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    list: <><path d="M8 6h12M8 12h12M8 18h12" /><path d="M3 6h1M3 12h1M3 18h1" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <path d="m9 5 7 7-7 7" />,
    file: <><path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6" /></>,
    print: <><path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7z" /><path d="M17 11h1" /></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" /></>,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function StatusBadge({ status }: { status: InspectionStatus }) {
  return <span className={`status-badge ${status}`}><span className="status-dot" />{STATUS_LABEL[status]}</span>;
}
function DateText({ value }: { value: string }) {
  return <>{new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</>;
}
function CountStrip({ items }: { items: InspectionItem[] }) {
  const total = counts(items);
  return <div className="count-strip">{(['checked', 'follow_up', 'not_checked'] as const).map(status => <span key={status} className={status}><span className="status-dot" />{STATUS_LABEL[status]} <strong>{total[status]}</strong></span>)}</div>;
}

export default function App() {
  const [initial] = useState(readInitial);
  const [store, setStore] = useState<Store>(initial.ok ? initial.store : emptyStore());
  const [route, setRoute] = useState<Route>(readRoute);
  const [error, setError] = useState(initial.ok ? '' : initial.error);
  const [message, setMessage] = useState(initial.ok ? 'ข้อมูลเก็บบนเบราว์เซอร์นี้' : 'อ่านข้อมูลไม่สำเร็จ');
  const [evidence, setEvidence] = useState<Record<string, Evidence>>({});
  const evidenceRef = useRef(evidence);
  evidenceRef.current = evidence;
  const [preview, setPreview] = useState<Evidence | null>(null);
  const disabled = !initial.ok;
  const vehicle = store.vehicles.find(v => v.id === route.vehicleId);
  const items = store.items.filter(i => i.vehicleId === route.vehicleId);
  useEffect(() => {
    const handleHash = () => { setRoute(readRoute()); setPreview(null); };
    window.addEventListener('hashchange', handleHash);
    return () => { window.removeEventListener('hashchange', handleHash); };
  }, []);
  useEffect(() => () => Object.values(evidenceRef.current).forEach(e => URL.revokeObjectURL(e.url)), []);
  function navigate(view: View, vehicleId?: string) {
    setPreview(null);
    location.hash = view === 'list' ? '' : view === 'new' ? 'new' : `vehicle/${vehicleId}/${view}`;
    setRoute({ view, vehicleId });
    window.scrollTo({ top: 0 });
  }
  function persist(next: Store): boolean {
    if (disabled) return false;
    try {
      saveStore(window.localStorage, next);
      setStore(next); setError(''); setMessage('บันทึกแล้วบนเบราว์เซอร์นี้');
      return true;
    } catch {
      setMessage('บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง');
      setError('บันทึกไม่สำเร็จ พื้นที่อาจเต็มหรือเบราว์เซอร์ไม่อนุญาต กรุณาตรวจการตั้งค่าแล้วลองอีกครั้ง ข้อมูลที่แก้ไขครั้งนี้ยังไม่ถูกบันทึก');
      return false;
    }
  }
  function updateItem(id: string, patch: Partial<Pick<InspectionItem, 'status' | 'note' | 'source' | 'evidenceFileName'>>): boolean {
    return persist({ ...store, items: store.items.map(item => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item) });
  }
  function attach(item: InspectionItem, file: File) {
    const problem = validateEvidence(file);
    if (problem) { setError(problem); return; }
    if (!item.source.trim()) { setError('กรุณาระบุแหล่งข้อมูลของหลักฐานก่อนแนบไฟล์ เช่น ผู้ขาย ช่าง หรือศูนย์'); return; }
    const url = URL.createObjectURL(file);
    if (!updateItem(item.id, { evidenceFileName: file.name })) { URL.revokeObjectURL(url); return; }
    const previous = evidence[item.id];
    if (previous) URL.revokeObjectURL(previous.url);
    setEvidence(previousState => ({ ...previousState, [item.id]: { url, type: file.type, name: file.name } }));
  }
  function saveVehicle(input: VehicleInput) {
    if (route.view === 'edit' && vehicle) {
      const cleaned = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
      const updated = { ...vehicle, ...cleaned } as Vehicle;
      if (persist({ ...store, vehicles: store.vehicles.map(v => v.id === vehicle.id ? updated : v) })) navigate('checklist', vehicle.id);
    } else if (route.view === 'new') {
      const created = createVehicle(input);
      if (persist({ ...store, vehicles: [created.vehicle, ...store.vehicles], items: [...store.items, ...created.items] })) navigate('checklist', created.vehicle.id);
    }
  }
  const detailView = ['checklist', 'summary', 'report'].includes(route.view) && vehicle;
  return <div className={`app-shell ${route.view === 'report' ? 'report-mode' : ''}`}>
    <aside className="sidebar no-print">
      <a className="brand" href="#" onClick={() => navigate('list')}><span className="brand-mark"><Icon name="car" size={25} /></span><span>ก่อนซื้อ<small>บันทึกตรวจรถ</small></span></a>
      <div className="workspace-name"><span className="workspace-dot" />พื้นที่ทดลองของทีม</div>
      <nav aria-label="เมนูหลัก">
        <button className={`nav-button ${route.view === 'list' ? 'active' : ''}`} onClick={() => navigate('list')}><Icon name="list" />รายการรถ<span className="nav-count">{store.vehicles.length}</span></button>
        <button className={`nav-button ${route.view === 'new' ? 'active' : ''}`} disabled={disabled} onClick={() => navigate('new')}><Icon name="plus" />เพิ่มรถ</button>
      </nav>
      <div className="sidebar-note"><Icon name="file" /><p>เก็บสิ่งที่ตรวจแล้ว<br />เห็นสิ่งที่ต้องตรวจต่อ</p></div>
      <div className="local-note"><span className="workspace-dot" /><span>ข้อมูลอยู่บนเครื่องนี้<small>ไม่มีการซิงก์ข้ามอุปกรณ์</small></span></div>
    </aside>
    <div className="workspace">
      <header className="topbar no-print"><span>พื้นที่บันทึกก่อนตัดสินใจซื้อ</span><span className={`save-state ${message.includes('ไม่สำเร็จ') ? 'save-error' : ''}`} role="status"><Icon name={message.includes('ไม่สำเร็จ') ? 'file' : 'check'} size={16} />{message}</span></header>
      <main id="main-content">
        {error && <div className="error-banner no-print" role="alert"><strong>มีสิ่งที่ต้องแก้ไข</strong><p>{error}</p>{!disabled && <button className="text-button" onClick={() => setError('')}>ปิดข้อความ</button>}</div>}
        {route.view === 'list' && <VehicleList store={store} disabled={disabled} onNew={() => navigate('new')} onOpen={id => navigate('checklist', id)} onSample={() => { const examples = sampleStore(); persist({ ...store, vehicles: [...store.vehicles, ...examples.vehicles], items: [...store.items, ...examples.items] }); }} />}
        {(route.view === 'new' || (route.view === 'edit' && vehicle)) && <VehicleForm key={route.view + (vehicle?.id ?? '')} vehicle={route.view === 'edit' ? vehicle : undefined} disabled={disabled} onSave={saveVehicle} onCancel={() => navigate(vehicle ? 'checklist' : 'list', vehicle?.id)} />}
        {detailView && <>
          <div className="vehicle-heading no-print"><div><div className="breadcrumb">รายการรถ <Icon name="arrow" size={13} /> {vehicle.plateNumber || 'ยังไม่ทราบทะเบียน'}</div><h1>{vehicle.makeModel}</h1><div className="vehicle-heading-meta"><span className="plate-inline">{vehicle.plateNumber || 'ยังไม่ทราบทะเบียน'}</span><span>{vehicle.year ? `ปี ${vehicle.year}` : 'ยังไม่ทราบปี'}</span><span>วันที่ตรวจ <DateText value={vehicle.inspectionDate} /></span>{vehicle.isSample && <span className="sample-label">ข้อมูลสมมติสำหรับทดลอง</span>}</div></div><button className="button secondary" onClick={() => navigate('edit', vehicle.id)}>แก้ไขข้อมูลรถ</button></div>
          <nav className="detail-tabs no-print" aria-label="หน้าข้อมูลรถ">{([{ view: 'checklist', label: 'เช็กลิสต์และหลักฐาน' }, { view: 'summary', label: 'สรุปผลตรวจ' }, { view: 'report', label: 'รายงานรถ' }] as const).map(tab => <button key={tab.view} className={route.view === tab.view ? 'selected' : ''} aria-current={route.view === tab.view ? 'page' : undefined} onClick={() => navigate(tab.view, vehicle.id)}>{tab.label}</button>)}</nav>
          {route.view === 'checklist' && <>
            <div className="section-header"><div><h2>เช็กทีละรายการ เก็บหลักฐานไว้ด้วยกัน</h2><p>เลือกสถานะตามการตรวจจริง หากยังต้องติดตาม ให้เลือกต้องตรวจเพิ่ม</p></div><CountStrip items={items} /></div>
            <div className="evidence-notice"><Icon name="file" size={18} /><span>ชื่อไฟล์และหมายเหตุจะอยู่ต่อ ไฟล์จริงดูได้เฉพาะรอบที่แนบ · JPG, PNG, PDF ไม่เกิน 10 MB</span></div>
            <div className="inspection-list">{items.map((item, index) => <InspectionRow key={item.id} item={item} index={index} attached={evidence[item.id]} onChange={patch => updateItem(item.id, patch)} onAttach={file => attach(item, file)} onPreview={() => setPreview(evidence[item.id])} />)}</div>
            <div className="bottom-action"><p>ตรวจครบหมายถึงบันทึกครบ ไม่ใช่การรับรองว่ารถปลอดภัย</p><button className="button primary" onClick={() => navigate('summary', vehicle.id)}>ดูสรุปผลตรวจ<Icon name="arrow" size={17} /></button></div>
          </>}
          {route.view === 'summary' && <Summary vehicle={vehicle} items={items} evidence={evidence} onEdit={id => { navigate('checklist', vehicle.id); requestAnimationFrame(() => document.getElementById(`item-${id}`)?.scrollIntoView({ block: 'center' })); }} onPreview={id => setPreview(evidence[id])} onReport={() => navigate('report', vehicle.id)} />}
          {route.view === 'report' && <><div className="report-toolbar no-print"><p>A4 แนวตั้ง · สรุป 1 หน้า · ข้อความเต็มอยู่ในแอป</p><button className="button primary" onClick={() => window.print()}><Icon name="print" />พิมพ์ / บันทึก PDF</button></div><Report vehicle={vehicle} items={items} /><div className="print-help no-print">ในการพิมพ์ เลือก A4, Scale 100% และปิดหัว/ท้ายกระดาษของเบราว์เซอร์</div></>}
        </>}
        {['edit', 'checklist', 'summary', 'report'].includes(route.view) && !vehicle && <div className="empty-state"><h1>ไม่พบรถคันนี้</h1><p>ข้อมูลอาจอยู่บนเบราว์เซอร์หรืออุปกรณ์อื่น</p><button className="button primary" onClick={() => navigate('list')}>กลับไปดูรายการรถ</button></div>}
      </main>
      <footer className="app-footer no-print"><span>ต้นแบบสำหรับทดลองกับทีมเต็นท์</span><span>ไม่เชื่อมต่อฐานข้อมูลประวัติรถ</span></footer>
    </div>
    {preview && <EvidenceDialog evidence={preview} onClose={() => setPreview(null)} />}
  </div>;
}

function VehicleList({ store, disabled, onNew, onOpen, onSample }: { store: Store; disabled: boolean; onNew: () => void; onOpen: (id: string) => void; onSample: () => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const vehicles = store.vehicles.filter(v => {
    const own = store.items.filter(i => i.vehicleId === v.id);
    return `${v.plateNumber} ${v.makeModel} ${v.sellerName}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (filter === 'all' || (filter === 'pending' ? own.some(i => i.status !== 'checked') : own.every(i => i.status === 'checked')));
  });
  return <>
    <div className="page-heading"><div><h1>รถที่กำลังพิจารณา</h1><p>รวบรวมข้อมูล เห็นสิ่งที่ยังขาด ก่อนตัดสินใจซื้อเข้าสต็อก</p></div><button className="button primary" disabled={disabled} onClick={onNew}><Icon name="plus" />เพิ่มรถ</button></div>
    <div className="intro-band"><div><h2>เริ่มจากข้อมูลที่มี แล้วตรวจต่อให้ครบ</h2><p>ไม่ต้องรู้เลขตัวถังหรือเลขเครื่องทั้งหมดตั้งแต่แรก<br />บันทึกไว้ก่อน แล้วใช้เช็กลิสต์ติดตามสิ่งที่ยังต้องตรวจ</p></div><div className="workflow-mini"><span><b>1</b>บันทึกรถ</span><Icon name="arrow" size={15} /><span><b>2</b>ตรวจและแนบหลักฐาน</span><Icon name="arrow" size={15} /><span><b>3</b>สรุปและส่งต่อ</span></div></div>
    <div className="list-controls"><div className="list-filters" aria-label="กรองรถ">{[['all', 'รถทั้งหมด'], ['pending', 'ยังมีรายการค้าง'], ['complete', 'บันทึกตรวจครบ']].map(([value, label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}{value === 'all' && <span>{store.vehicles.length}</span>}</button>)}</div><label className="search-field"><Icon name="search" size={17} /><input aria-label="ค้นหารถ" value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นทะเบียน รุ่น หรือผู้ขาย" /></label></div>
    {vehicles.length ? <div className="vehicle-table"><div className="table-head"><span>รถ / ทะเบียน</span><span>วันที่ตรวจ</span><span>สถานะการตรวจ</span><span /></div>{vehicles.map(vehicle => {
      const own = store.items.filter(i => i.vehicleId === vehicle.id);
      return <button className="vehicle-row" key={vehicle.id} aria-label={`เปิดรถ ${vehicle.makeModel} ${vehicle.plateNumber}`} onClick={() => onOpen(vehicle.id)}><span className="vehicle-cell"><span className="vehicle-symbol"><Icon name="car" size={27} /></span><span><strong>{vehicle.makeModel}</strong><span className="vehicle-subline">{vehicle.plateNumber || 'ยังไม่ทราบทะเบียน'}{vehicle.year && ` · ${vehicle.year}`}</span>{vehicle.isSample && <span className="sample-label">ข้อมูลสมมติสำหรับทดลอง</span>}</span></span><span className="date-cell"><DateText value={vehicle.inspectionDate} /></span><CountStrip items={own} /><Icon name="arrow" size={19} /></button>;
    })}</div> : <div className="empty-state"><span className="empty-icon"><Icon name="car" size={36} /></span><h2>{store.vehicles.length ? 'ไม่พบรถตามที่ค้นหา' : 'เริ่มบันทึกรถคันแรกของทีม'}</h2><p>{store.vehicles.length ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรอง' : 'เพิ่มรถที่กำลังพิจารณา หรือทดลองกับข้อมูลสมมติก่อน'}</p>{!store.vehicles.length && <button className="button secondary" disabled={disabled} onClick={onSample}>โหลดรถตัวอย่าง 2 คัน</button>}</div>}
    <div className="list-footnote"><Icon name="file" size={17} /><span>บันทึกนี้ช่วยติดตามการตรวจของทีม ไม่ยืนยันประวัติรถแทนหน่วยงานหรือฐานข้อมูลทางการ</span></div>
  </>;
}

function VehicleForm({ vehicle, disabled, onSave, onCancel }: { vehicle?: Vehicle; disabled: boolean; onSave: (input: VehicleInput) => void; onCancel: () => void }) {
  const [input, setInput] = useState<VehicleInput>({ plateNumber: vehicle?.plateNumber ?? '', makeModel: vehicle?.makeModel ?? '', year: vehicle?.year ?? '', chassisNumber: vehicle?.chassisNumber ?? '', engineNumber: vehicle?.engineNumber ?? '', sellerName: vehicle?.sellerName ?? '', inspectionDate: vehicle?.inspectionDate ?? localDate() });
  const [problem, setProblem] = useState('');
  const fields: { key: keyof VehicleInput; label: string; placeholder: string; type?: string; max?: number }[] = [
    { key: 'plateNumber', label: 'ทะเบียน', placeholder: 'เช่น กข 1234 กรุงเทพมหานคร', max: 80 },
    { key: 'makeModel', label: 'ยี่ห้อ / รุ่น *', placeholder: 'เช่น Toyota Hilux Revo', max: 120 },
    { key: 'year', label: 'ปีรถ (ค.ศ. / พ.ศ.)', placeholder: 'เช่น 2020', max: 4 },
    { key: 'inspectionDate', label: 'วันที่ตรวจ *', placeholder: '', type: 'date' },
    { key: 'chassisNumber', label: 'เลขตัวถัง', placeholder: 'เว้นว่างได้ หากยังไม่ทราบ', max: 80 },
    { key: 'engineNumber', label: 'เลขเครื่อง', placeholder: 'เว้นว่างได้ หากยังไม่ทราบ', max: 80 },
    { key: 'sellerName', label: 'ผู้ขาย / แหล่งที่มาของรถ', placeholder: 'ชื่อที่ทีมใช้เรียก ไม่ต้องกรอกข้อมูลส่วนตัวอื่น', max: 120 },
  ];
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!input.makeModel.trim()) { setProblem('กรุณากรอกยี่ห้อ / รุ่น'); return; }
    if (input.year && !/^\d{4}$/.test(input.year)) { setProblem('กรุณากรอกปีเป็นตัวเลข 4 หลัก หรือเว้นว่าง'); return; }
    setProblem(''); onSave(input);
  }
  return <><div className="page-heading"><div><h1>{vehicle ? 'แก้ไขข้อมูลรถ' : 'เพิ่มรถที่กำลังพิจารณา'}</h1><p>เริ่มจากข้อมูลที่ทราบ ช่องอื่นกลับมาเติมภายหลังได้</p></div></div><form className="vehicle-form" onSubmit={submit}><div className="form-section-title"><Icon name="car" /><h2>ข้อมูลรถพื้นฐาน</h2><span>* จำเป็นต้องกรอก</span></div><div className="form-grid">{fields.map(field => <label key={field.key} className={field.key === 'sellerName' ? 'full-width' : ''}>{field.label}<input type={field.type ?? 'text'} required={['makeModel', 'inspectionDate'].includes(field.key)} maxLength={field.max} value={String(input[field.key] ?? '')} placeholder={field.placeholder} onChange={e => setInput({ ...input, [field.key]: e.target.value })} /></label>)}</div>{problem && <p className="form-error" role="alert">{problem}</p>}<div className="form-note">ไม่จำเป็นต้องกรอกเลขตัวถังหรือเลขเครื่องเพื่อเริ่มบันทึก และไม่ต้องเก็บเลขบัตรประชาชนหรือเบอร์โทรผู้ขาย</div><div className="form-actions"><button className="button secondary" type="button" onClick={onCancel}>ยกเลิก</button><button className="button primary" type="submit" disabled={disabled}>บันทึกข้อมูลรถ<Icon name="arrow" size={17} /></button></div></form></>;
}

function InspectionRow({ item, index, attached, onChange, onAttach, onPreview }: { item: InspectionItem; index: number; attached?: Evidence; onChange: (patch: Partial<InspectionItem>) => void; onAttach: (file: File) => void; onPreview: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  return <section className="inspection-row" id={`item-${item.id}`} data-testid="inspection-item"><div className="inspection-row-heading"><span className={`item-index ${item.status}`}>{item.status === 'checked' ? <Icon name="check" size={16} /> : index + 1}</span><h3>{item.itemName}</h3><StatusBadge status={item.status} /></div><div className="inspection-content"><div className="status-switch" role="group" aria-label={`สถานะ ${item.itemName}`}>{(['not_checked', 'follow_up', 'checked'] as const).map(status => <button key={status} className={item.status === status ? `selected ${status}` : ''} aria-pressed={item.status === status} onClick={() => onChange({ status })}>{item.status === status && <Icon name="check" size={13} />}{STATUS_LABEL[status]}</button>)}</div><p className="status-help">หากยังต้องติดตาม ให้เลือก “ต้องตรวจเพิ่ม”</p><div className="inspection-fields"><label>หมายเหตุ<textarea rows={2} maxLength={2000} placeholder="เริ่มด้วยสิ่งที่ต้องติดตาม เช่น ขอเอกสารต้นฉบับ แล้วบันทึกสิ่งที่พบ" value={item.note} onChange={e => onChange({ note: e.target.value })} /></label><label>แหล่งข้อมูล<input maxLength={120} placeholder="เช่น ผู้ขาย ช่าง หรือศูนย์" value={item.source} onChange={e => onChange({ source: e.target.value })} /></label></div><div className="attachment-row"><input ref={fileInput} className="file-input" type="file" aria-label={`แนบหลักฐาน ${item.itemName}`} accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" onChange={e => { const file = e.target.files?.[0]; if (file) onAttach(file); e.target.value = ''; }} /><button className="button attachment-button" onClick={() => fileInput.current?.click()}><Icon name="upload" size={16} />{item.evidenceFileName ? 'แนบใหม่ / เปลี่ยนไฟล์' : 'แนบหลักฐาน'}</button>{item.evidenceFileName ? <div className="attachment-info"><span className="filename">{item.evidenceFileName}</span>{attached ? <button className="text-button" onClick={onPreview}>เปิดหลักฐาน</button> : <small>ต้องแนบไฟล์อีกครั้งเพื่อเปิดดู</small>}</div> : <span className="muted attachment-hint">หนึ่งไฟล์ต่อรายการ · ระบุแหล่งข้อมูลก่อนแนบ</span>}</div></div></section>;
}

function Summary({ vehicle, items, evidence, onEdit, onPreview, onReport }: { vehicle: Vehicle; items: InspectionItem[]; evidence: Record<string, Evidence>; onEdit: (id: string) => void; onPreview: (id: string) => void; onReport: () => void }) {
  const missing = [['ทะเบียน', vehicle.plateNumber], ['ปีรถ', vehicle.year], ['เลขตัวถัง', vehicle.chassisNumber], ['เลขเครื่อง', vehicle.engineNumber], ['ผู้ขาย', vehicle.sellerName]].filter(([, value]) => !value.trim()).map(([label]) => label);
  const total = counts(items);
  return <><div className="summary-title"><div><h2>สิ่งที่ต้องติดตามก่อนตัดสินใจ</h2><p>ทบทวนข้อมูลและหลักฐานที่ทีมบันทึกไว้</p></div><button className="button primary" onClick={onReport}><Icon name="file" />สร้างรายงาน</button></div><CountStrip items={items} /><div className="summary-grid"><div className="summary-work">{(['follow_up', 'not_checked', 'checked'] as const).map(status => <section className="summary-group" key={status}><h3>{STATUS_LABEL[status]} ({total[status]})</h3>{items.filter(i => i.status === status).map(item => <div className="summary-item" key={item.id}><div><h4>{item.itemName}</h4><p className={item.note ? '' : 'muted'}>{item.note || 'ยังไม่มีหมายเหตุ'}</p><span className="source-line">แหล่งข้อมูล: {item.source || 'ยังไม่ระบุ'}</span>{item.evidenceFileName && <div className="summary-evidence"><Icon name="file" size={15} /><span>{item.evidenceFileName}</span>{evidence[item.id] ? <button className="text-button" onClick={() => onPreview(item.id)}>เปิดหลักฐาน</button> : <small>ต้องแนบไฟล์อีกครั้งเพื่อเปิดดู</small>}</div>}</div><button className="text-button" onClick={() => onEdit(item.id)}>ไปตรวจรายการ<Icon name="arrow" size={14} /></button></div>)}{!total[status] && <p className="group-empty">ไม่มีรายการในสถานะนี้</p>}</section>)}</div><aside className="summary-aside"><section><h3>ข้อมูลรถ</h3><dl>{[['ทะเบียน', vehicle.plateNumber], ['รุ่น', vehicle.makeModel], ['ปี', vehicle.year], ['เลขตัวถัง', vehicle.chassisNumber], ['เลขเครื่อง', vehicle.engineNumber], ['ผู้ขาย', vehicle.sellerName]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'ยังไม่ทราบ'}</dd></div>)}</dl></section><section className="missing-section"><h3>ข้อมูลที่ยังไม่ครบ</h3>{missing.length ? <ul>{missing.map(label => <li key={label}>{label}</li>)}</ul> : <p>กรอกข้อมูลรถพื้นฐานครบแล้ว</p>}<p>ข้อมูลที่ยังว่างไม่ขัดขวางการสร้างรายงาน</p></section><div className="disclaimer"><Icon name="file" /><p>{DISCLAIMER}</p></div></aside></div></>;
}

export function Report({ vehicle, items }: { vehicle: Vehicle; items: InspectionItem[] }) {
  const total = counts(items);
  const orderedItems = [...pendingItems(items), ...items.filter(item => item.status === 'checked')];
  const dense = items.reduce((length, item) => length + Array.from(item.note).length, 0) > 400
    || [vehicle.plateNumber, vehicle.chassisNumber, vehicle.engineNumber].some(value => value.length > 30);
  return <article className={`report-sheet ${dense ? 'report-dense' : ''}`} data-testid="report">
    <header className="report-header"><div><h1>รายงานบันทึกตรวจรถก่อนซื้อ</h1><p>ก่อนซื้อ · บันทึกของทีมเพื่อประกอบการพิจารณา</p></div><span>วันที่ตรวจ<br /><strong><DateText value={vehicle.inspectionDate} /></strong></span></header>
    {vehicle.isSample && <div className="report-sample">ข้อมูลสมมติสำหรับทดลอง</div>}
    <section className="report-vehicle">
      <h2>{reportShort(vehicle.makeModel, 32)}</h2>
      <dl className="report-meta">{[['ปีรถ', vehicle.year], ['ผู้ขาย', vehicle.sellerName]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{reportShort(value, 30) || 'ยังไม่ทราบ'}</dd></div>)}</dl>
      <dl className="report-identifiers">{[['ทะเบียน', vehicle.plateNumber], ['เลขตัวถัง', vehicle.chassisNumber], ['เลขเครื่อง', vehicle.engineNumber]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'ยังไม่ทราบ'}</dd></div>)}</dl>
    </section>
    <div className="report-counts">ตรวจแล้ว {total.checked} / {CHECKLIST.length} รายการ <span>ต้องตรวจเพิ่ม {total.follow_up}</span><span>ยังไม่ได้ตรวจ {total.not_checked}</span></div>
    <table className="report-table"><thead><tr><th>รายการตรวจ</th><th>สถานะ</th><th>หมายเหตุ / สิ่งที่ต้องติดตาม</th><th>แหล่งข้อมูล / ชื่อหลักฐาน</th></tr></thead><tbody>{orderedItems.map(item => <tr key={item.id}><td>{item.itemName}</td><td><StatusBadge status={item.status} /></td><td>{reportNote(item.note) || 'ยังไม่มีหมายเหตุ'}</td><td><div>{reportShort(item.source, 20) || 'ยังไม่ระบุแหล่งข้อมูล'}</div><div className="report-filename">{reportShort(item.evidenceFileName, 28) || 'ไม่มีไฟล์แนบ'}</div></td></tr>)}</tbody></table>
    <footer className="report-footer"><p><strong>{DISCLAIMER}</strong></p><p>รายการค้างแสดงก่อนรายการตรวจแล้ว · “ตรวจแล้ว” ไม่ได้หมายถึงผ่านหรือปลอดภัย</p><p>รายงานเป็นสรุป ข้อความที่ระบุ “ย่อ” อ่านฉบับเต็มได้ในแอป · แสดงชื่อหลักฐาน ไม่ได้แนบไฟล์จริง</p><p>หลังเปิดแอปใหม่ต้องแนบไฟล์อีกครั้งเพื่อเปิดดู</p></footer>
  </article>;
}

function EvidenceDialog({ evidence, onClose }: { evidence: Evidence; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog className="evidence-dialog no-print" aria-labelledby="evidence-title" ref={dialog} onCancel={onClose}><div className="dialog-heading"><h2 id="evidence-title">{evidence.name}</h2><button className="button secondary" onClick={onClose}>ปิดหลักฐาน</button></div>{evidence.type.startsWith('image/') ? <img src={evidence.url} alt={`หลักฐาน ${evidence.name}`} /> : <object data={evidence.url} type="application/pdf"><p>เบราว์เซอร์นี้ไม่แสดง PDF ในหน้าต่างนี้ <a href={evidence.url} target="_blank" rel="noreferrer">เปิดไฟล์ PDF</a></p></object>}<p className="muted">ไฟล์นี้เปิดดูได้เฉพาะรอบที่แนบ ชื่อไฟล์จะถูกบันทึกไว้</p></dialog>;
}
