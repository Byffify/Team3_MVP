import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createVehicle, sampleStore, STORAGE_KEY, type Store } from '../src/model.ts';

// Dependency-free integration harness: an isolated browser profile and Chromium CDP.
// It never uses, edits, or deletes the user's browser profile.
class Browser {
  socket: WebSocket;
  sequence = 0;
  pending = new Map<number, { resolve: (result: any) => void; reject: (error: Error) => void }>();
  loaded = new Set<() => void>();
  constructor(socket: WebSocket) {
    this.socket = socket;
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.method === 'Page.loadEventFired') this.loaded.forEach(resolve => resolve());
      if (process.env.DEBUG_CDP) console.log('CDP received', JSON.stringify(message).slice(0, 500));
      const pending = this.pending.get(message.id);
      if (pending) {
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
        else pending.resolve(message.result);
      }
    });
  }
  send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
      this.pending.set(id, { resolve: result => { clearTimeout(timeout); resolve(result); }, reject: error => { clearTimeout(timeout); reject(error); } });
      if (process.env.DEBUG_CDP) console.log('CDP send', method);
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression: string) {
    const response = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  }
  async load(method: 'Page.reload' | 'Page.navigate', params: Record<string, unknown> = {}) {
    let complete!: () => void;
    const finished = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { this.loaded.delete(complete); reject(new Error(`Load timeout: ${method}`)); }, 15000);
      complete = () => { clearTimeout(timeout); this.loaded.delete(complete); resolve(); };
      this.loaded.add(complete);
    });
    await this.send(method, params);
    await finished;
  }
  async wait(expression: string) {
    const start = Date.now();
    while (Date.now() - start < 15000) {
      if (await this.evaluate(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const state = await this.evaluate(`JSON.stringify({url:location.href,title:document.title,text:document.body?.innerText.slice(0,2000)})`);
    throw new Error(`Timed out waiting: ${expression}; state: ${state}`);
  }
  async click(label: string, within = 'document') {
    const found = await this.evaluate(`(() => { const button = Array.from(${within}.querySelectorAll('button')).find(b => b.textContent.trim() === ${JSON.stringify(label)}); if(!button) return false; button.click(); return true; })()`);
    assert.ok(found, `Button not found: ${label}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  async input(label: string, value: string, within = 'document') {
    const result = await this.evaluate(`(() => { const label = Array.from(${within}.querySelectorAll('label')).find(l => l.childNodes[0]?.textContent.trim() === ${JSON.stringify(label)}); const el = label?.querySelector('input,textarea'); if(!el) return false; Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles:true })); return true; })()`);
    assert.ok(result, `Input not found: ${label}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

test('complete desktop/mobile workflow, storage errors and one-page PDF', { timeout: 120000 }, async () => {
  const executable = process.env.BROWSER_EXECUTABLE ?? [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/chromium', '/usr/bin/google-chrome',
  ].find(existsSync);
  assert.ok(executable, 'Install Chrome/Edge or set BROWSER_EXECUTABLE');
  const profile = resolve(`.cache/browser-${Date.now()}`);
  await mkdir(profile, { recursive: true });
  await mkdir('docs/qa', { recursive: true });
  const child = spawn(executable, ['--headless', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  child.stderr?.on('data', data => { if(process.env.DEBUG_CDP) console.log(String(data).slice(0, 600)); });
  let browser: Browser | undefined;
  try {
    const start = Date.now();
    let port = '';
    while (!port && Date.now() - start < 15000) {
      try { port = (await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; }
      catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.ok(port, 'Headless browser did not start');
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() as any[];
    if (process.env.DEBUG_CDP) console.log('CDP tabs', tabs);
    const socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => { socket.addEventListener('open', () => resolve(), { once: true }); socket.addEventListener('error', () => reject(new Error('CDP connection failed')), { once: true }); });
    browser = new Browser(socket);
    await browser.send('Browser.getVersion');
    await browser.send('Page.enable');
    await browser.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await browser.load('Page.navigate', { url: 'http://127.0.0.1:5173' });
    await browser.wait(`document.querySelector('h1')?.textContent === 'ก่อนรับรถเข้าสต็อก เช็กสิ่งที่ยังขาดให้ครบ'`);
    assert.ok(await browser.evaluate(`document.title.includes('2Cars')`));
    assert.ok(await browser.evaluate(`document.querySelector('meta[name="description"]').content.includes('หลักฐาน')`));
    assert.equal(await browser.evaluate(`document.querySelectorAll('.landing-faq details').length`), 5);
    assert.ok(await browser.evaluate(`document.querySelector('#problems').textContent.includes('1 คน')`));
    await browser.wait(`document.querySelector('.landing-app-preview img')?.complete && document.querySelector('.landing-app-preview img').naturalWidth > 0`);
    const landingMetrics = await browser.send('Page.getLayoutMetrics');
    await writeFile('docs/qa/landing-full.png', Buffer.from((await browser.send('Page.captureScreenshot', { captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1440, height: landingMetrics.cssContentSize.height, scale: 1 } })).data, 'base64'));
    await browser.click('บันทึกการลงชื่อทดลอง');
    assert.equal(await browser.evaluate(`document.querySelectorAll('.signup-field-error').length`), 3);
    assert.equal(await browser.evaluate(`localStorage.getItem('2cars:signup-demo:v1')`), null);
    await browser.input('ชื่อ', 'ผู้ทดลอง 2Cars');
    await browser.input('อีเมล', 'demo@example.com');
    await browser.input('คุณเกี่ยวข้องกับการซื้อรถในบทบาทใด?', 'ผู้ดูแลเต็นท์');
    await browser.click('บันทึกการลงชื่อทดลอง');
    await browser.wait(`document.querySelector('.signup-confirmation')?.textContent.includes('ยังไม่ได้ส่งถึงทีม')`);
    assert.equal(await browser.evaluate(`document.activeElement?.id`), 'signup-confirmation-title', 'confirmation should receive keyboard focus');
    assert.equal(await browser.evaluate(`JSON.parse(localStorage.getItem('2cars:signup-demo:v1')).email`), 'demo@example.com');
    await browser.click('แก้ไขข้อมูลลงชื่อ');
    assert.equal(await browser.evaluate(`document.activeElement?.id`), 'signup-name', 'editing should return focus to form');
    await browser.click('บันทึกการลงชื่อทดลอง');
    await browser.wait(`!!document.querySelector('.signup-confirmation')`);
    await browser.evaluate(`window.scrollTo(0,0)`);
    await writeFile('docs/qa/landing-desktop.png', Buffer.from((await browser.send('Page.captureScreenshot', { captureBeyondViewport: false })).data, 'base64'));
    const signupClip = await browser.evaluate(`(() => { const box=document.querySelector('#signup').getBoundingClientRect(); return {x:0,y:box.top+scrollY,width:innerWidth,height:box.height,scale:1}; })()`);
    await writeFile('docs/qa/landing-confirmation.png', Buffer.from((await browser.send('Page.captureScreenshot', { captureBeyondViewport: true, clip: signupClip })).data, 'base64'));
    for (const width of [320, 390, 768, 1024]) {
      await browser.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width < 760 });
      assert.ok(await browser.evaluate(`document.documentElement.scrollWidth <= innerWidth`), `landing has overflow at ${width}px`);
    }
    await browser.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.ok(await browser.evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'landing must fit mobile');
    await browser.evaluate(`window.scrollTo(0,0)`);
    await writeFile('docs/qa/landing-mobile.png', Buffer.from((await browser.send('Page.captureScreenshot', { captureBeyondViewport: false })).data, 'base64'));
    await browser.evaluate(`document.querySelector('.landing-faq summary').click()`);
    assert.ok(await browser.evaluate(`document.querySelector('.landing-faq details').open`));
    await browser.evaluate(`location.hash='new'`);
    await browser.wait(`location.pathname === '/app.html' && !!document.querySelector('.vehicle-form')`);
    await browser.load('Page.navigate', { url: 'http://127.0.0.1:5173' });
    await browser.wait(`!!document.querySelector('.landing-hero')`);
    await browser.evaluate(`document.querySelector('.landing-hero a[href="/app.html"]').click()`);
    await browser.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await browser.wait(`document.querySelector('h1')?.textContent.includes('รถที่กำลังพิจารณา')`);
    await browser.click('เพิ่มรถ');
    await browser.input('ยี่ห้อ / รุ่น *', 'Toyota Hilux Revo');
    await browser.input('ทะเบียน', 'กข 1234');
    await browser.click('บันทึกข้อมูลรถ');
    await browser.wait(`document.querySelectorAll('[data-testid="inspection-item"]').length === 8`);
    const first = `document.querySelector('[data-testid="inspection-item"]')`;
    await browser.click('ต้องตรวจเพิ่ม', first);
    await browser.input('หมายเหตุ', 'ขอเอกสารต้นฉบับจากผู้ขาย', first);
    await browser.input('แหล่งข้อมูล', 'ผู้ขาย', first);
    await browser.evaluate(`(() => { const input = ${first}.querySelector('input[type=file]'); const data = new DataTransfer(); data.items.add(new File([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV6kAAAAASUVORK5CYII='), c=>c.charCodeAt(0))], 'evidence.png', {type:'image/png'})); input.files = data.files; input.dispatchEvent(new Event('change', {bubbles:true})); })()`);
    await browser.wait(`${first}.textContent.includes('เปิดหลักฐาน')`);
    await browser.click('เปิดหลักฐาน', first);
    await browser.wait(`document.querySelector('dialog')?.open === true`);
    await browser.click('ปิดหลักฐาน');
    await browser.click('ตรวจแล้ว', `document.querySelectorAll('[data-testid="inspection-item"]')[1]`);
    await browser.load('Page.reload');
    await browser.wait(`document.querySelector('[data-testid="inspection-item"] textarea')?.value === 'ขอเอกสารต้นฉบับจากผู้ขาย'`);
    assert.ok(await browser.evaluate(`${first}.textContent.includes('ต้องแนบไฟล์อีกครั้งเพื่อเปิดดู')`));
    assert.equal(await browser.evaluate(`${first}.querySelector('button[aria-pressed="true"]').textContent`), 'ต้องตรวจเพิ่ม');
    const saved = await browser.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}))`) as Store;
    assert.equal(saved.items[0].evidenceFileName, 'evidence.png');
    assert.equal(saved.items[0].source, 'ผู้ขาย');
    await browser.click('สรุปผลตรวจ');
    await browser.wait(`document.querySelector('main')?.textContent.includes('ต้องตรวจเพิ่ม (1)')`);
    assert.ok(await browser.evaluate(`document.querySelector('main').textContent.includes('ยังไม่ได้ตรวจ (6)')`));
    await browser.click('สร้างรายงาน');
    await browser.wait(`!!document.querySelector('[data-testid="report"]')`);
    assert.ok(await browser.evaluate(`document.querySelector('[data-testid="report"]').textContent.includes('ไม่ใช่การยืนยันประวัติ')`));
    const reportPdf = await browser.send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
    const pdf = Buffer.from(reportPdf.data, 'base64');
    assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length, 1, 'standard report must be one page');
    await writeFile('docs/qa/workflow-report.pdf', pdf);

    // Worst-case report: all vehicle fields filled and eight long notes/sources/filenames.
    const longCar = createVehicle({ makeModel: 'รถตัวอย่างสำหรับทดสอบรายงานที่มีข้อความยาว'.repeat(3), inspectionDate: '2026-10-06', plateNumber: 'กข 9999 กรุงเทพมหานคร', year: '2020', chassisNumber: 'X'.repeat(80), engineNumber: 'E'.repeat(80), sellerName: 'ผู้ขายสมมติ'.repeat(12), isSample: true });
    longCar.items.forEach((item, index) => { item.note = (index % 2 ? 'บันทึกการตรวจรายการนี้แล้ว รายละเอียดการตรวจจากช่างและผู้ขายสมมติ ' : 'ต้องตรวจหลักฐานเพิ่มเติมจากช่างและผู้ขายก่อนตัดสินใจซื้อ ').repeat(35); item.source = 'ศูนย์บริการสมมติ'.repeat(8); item.evidenceFileName = 'ชื่อหลักฐานสมมติที่ยาวมาก'.repeat(8) + '.pdf'; item.status = index % 2 ? 'checked' : 'follow_up'; });
    await browser.evaluate(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify({schemaVersion:1,vehicles:[longCar.vehicle],items:longCar.items}))}); location.hash=${JSON.stringify(`vehicle/${longCar.vehicle.id}/report`)};`);
    await browser.load('Page.reload');
    await browser.wait(`document.querySelector('[data-testid="report"]')?.textContent.includes('ย่อ')`);
    const identifierText = await browser.evaluate(`document.querySelector('.report-vehicle').textContent`);
    assert.ok(identifierText.includes('X'.repeat(80)), 'full chassis number must be present on paper');
    assert.ok(identifierText.includes('E'.repeat(80)), 'full engine number must be present on paper');
    const worstPdf = Buffer.from((await browser.send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 })).data, 'base64');
    await writeFile('docs/qa/long-report.pdf', worstPdf);
    await browser.send('Emulation.setEmulatedMedia', { media: 'print' });
    await writeFile('docs/qa/report.png', Buffer.from((await browser.send('Page.captureScreenshot', { captureBeyondViewport: true })).data, 'base64'));
    console.log('Print report height:', await browser.evaluate(`document.querySelector('.report-sheet').getBoundingClientRect().height`));
    await browser.send('Emulation.setEmulatedMedia', { media: '' });
    assert.equal((worstPdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length, 1, 'worst-case report must be one page');

    longCar.vehicle.makeModel = 'W'.repeat(120);
    longCar.vehicle.plateNumber = 'W'.repeat(80);
    longCar.vehicle.sellerName = 'W'.repeat(120);
    longCar.items.forEach(item => { item.note = 'W'.repeat(2000); item.source = 'W'.repeat(120); item.evidenceFileName = 'W'.repeat(200) + '.pdf'; });
    await browser.evaluate(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify({schemaVersion:1,vehicles:[longCar.vehicle],items:longCar.items}))});`);
    await browser.load('Page.reload');
    await browser.wait(`document.querySelector('[data-testid="report"]')?.textContent.includes('WWWW')`);
    await browser.send('Emulation.setDeviceMetricsOverride', { width: 794, height: 1123, deviceScaleFactor: 1, mobile: false });
    const widePdf = Buffer.from((await browser.send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 })).data, 'base64');
    await writeFile('docs/qa/wide-report.pdf', widePdf);
    await browser.send('Emulation.setEmulatedMedia', { media: 'print' });
    console.log('Wide report height:', await browser.evaluate(`document.querySelector('.report-sheet').getBoundingClientRect().height`));
    await writeFile('docs/qa/wide-report.png', Buffer.from((await browser.send('Page.captureScreenshot', { captureBeyondViewport: true })).data, 'base64'));
    await browser.send('Emulation.setEmulatedMedia', { media: '' });
    assert.equal((widePdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length, 1, 'wide Latin text must fit on one page');
    await browser.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

    // Separate vehicles and desktop screenshot.
    const samples = sampleStore();
    await browser.evaluate(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)},${JSON.stringify(JSON.stringify(samples))}); location.hash='';`);
    await browser.load('Page.reload');
    await browser.wait(`document.querySelectorAll('.vehicle-row').length === 2`);
    await writeFile('docs/qa/desktop.png', Buffer.from((await browser.send('Page.captureScreenshot', { captureBeyondViewport: false })).data, 'base64'));
    await browser.evaluate(`document.querySelector('.vehicle-row').click()`);
    await browser.wait(`document.querySelectorAll('[data-testid="inspection-item"]').length === 8`);
    await browser.click('รายงานรถ');
    const samplePdf = Buffer.from((await browser.send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 })).data, 'base64');
    await writeFile('docs/example-report.pdf', samplePdf);
    assert.ok(await browser.evaluate(`document.querySelector('[data-testid="report"]').textContent.includes('ข้อมูลสมมติสำหรับทดลอง')`));
    await browser.click('เช็กลิสต์และหลักฐาน');
    await browser.input('หมายเหตุ', 'เฉพาะคันแรก', first);
    await browser.evaluate(`document.querySelector('.nav-button').click()`);
    await browser.wait(`document.querySelectorAll('.vehicle-row').length === 2`);
    await browser.evaluate(`document.querySelectorAll('.vehicle-row')[1].click()`);
    await browser.wait(`document.querySelectorAll('[data-testid="inspection-item"]').length === 8`);
    assert.notEqual(await browser.evaluate(`${first}.querySelector('textarea').value`), 'เฉพาะคันแรก');

    await browser.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.ok(await browser.evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'mobile checklist has horizontal overflow');
    assert.ok(await browser.evaluate(`${first}.getBoundingClientRect().top < 520`), 'mobile first inspection must start before 520px');
    assert.ok(await browser.evaluate(`${first}.querySelector('.status-switch button').getBoundingClientRect().height >= 44`), 'mobile status buttons need a 44px touch target');
    assert.equal(await browser.evaluate(`getComputedStyle(${first}.querySelector('.inspection-row-heading .status-badge')).display`), 'none', 'mobile avoids duplicated status badge');
    await writeFile('docs/qa/mobile.png', Buffer.from((await browser.send('Page.captureScreenshot', { captureBeyondViewport: false })).data, 'base64'));
    await browser.click('สรุปผลตรวจ');
    assert.ok(await browser.evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'mobile summary has horizontal overflow');
    await browser.evaluate(`document.querySelector('.nav-button').click()`);
    await browser.click('เพิ่มรถ');
    await browser.input('ยี่ห้อ / รุ่น *', 'รถทดลองมือถือ');
    await browser.click('บันทึกข้อมูลรถ');
    await browser.wait(`document.querySelectorAll('[data-testid="inspection-item"]').length === 8`);
    assert.ok(await browser.evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'mobile new vehicle has overflow');

    // File validation does not overwrite existing metadata or change status.
    await browser.input('แหล่งข้อมูล', 'ช่าง', first);
    await browser.evaluate(`(() => { const input = ${first}.querySelector('input[type=file]'); const data = new DataTransfer(); data.items.add(new File(['bad'], 'bad.svg', {type:'image/svg+xml'})); input.files=data.files; input.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await browser.wait(`document.querySelector('[role="alert"]')?.textContent.includes('รองรับเฉพาะ')`);
    assert.equal(await browser.evaluate(`${first}.querySelector('button[aria-pressed="true"]').textContent`), 'ยังไม่ได้ตรวจ');

    // Failed writes retain the previous saved state, with a visible alert.
    await browser.evaluate(`Storage.prototype.setItem = function(){throw new DOMException('quota','QuotaExceededError')}`);
    await browser.click('ตรวจแล้ว', first);
    await browser.wait(`document.querySelector('[role="alert"]')?.textContent.includes('บันทึกไม่สำเร็จ')`);
    assert.equal(await browser.evaluate(`${first}.querySelector('button[aria-pressed="true"]').textContent`), 'ยังไม่ได้ตรวจ');
    assert.ok(await browser.evaluate(`document.querySelector('.save-state').textContent.includes('บันทึกไม่สำเร็จ')`));
    await browser.load('Page.reload');
    await browser.wait(`document.querySelectorAll('[data-testid="inspection-item"]').length === 8`);
    await browser.evaluate(`location.hash='vehicle/missing/edit'`);
    await browser.wait(`document.querySelector('main')?.textContent.includes('ไม่พบรถคันนี้')`);
    assert.equal(await browser.evaluate(`!!document.querySelector('.vehicle-form')`), false);
    await browser.evaluate(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)},'{broken'); location.hash='';`);
    await browser.load('Page.reload');
    await browser.wait(`document.querySelector('[role="alert"]')?.textContent.includes('อ่านข้อมูล')`);
    assert.equal(await browser.evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`), '{broken');
    assert.ok(await browser.evaluate(`Array.from(document.querySelectorAll('button')).filter(b=>b.textContent.trim()==='เพิ่มรถ').every(b=>b.disabled)`));
  } finally {
    browser?.socket.close();
    child.kill();
  }
});
