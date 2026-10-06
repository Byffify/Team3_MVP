import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { submitSignup, validateSignup } from './signup.ts';

describe('Make waitlist submission', () => {
  it('requires name, valid email and extra before sending', async () => {
    assert.deepEqual(Object.keys(validateSignup({ name: '', email: 'bad', extra: '' })), ['name', 'email', 'extra']);
    assert.deepEqual(validateSignup({ name: 'ผู้ทดลอง', email: 'demo@example.com', extra: 'ผู้ดูแลเต็นท์' }), {});
    await assert.rejects(submitSignup({ name: '', email: 'bad', extra: '' }, async () => assert.fail('invalid form must not send')));
  });
  it('POSTs exactly three URL-encoded fields with no-cors and no JSON headers', async () => {
    let called = false;
    await submitSignup({ name: ' ผู้ทดลอง ', email: ' Demo@Example.com ', extra: ' ผู้ดูแลเต็นท์ ' }, async (url, init) => {
      called = true;
      assert.ok(typeof url === 'string' && url.startsWith('https://hook.eu1.make.com/'));
      assert.equal(init?.method, 'POST');
      assert.equal(init?.mode, 'no-cors');
      assert.equal(init?.headers, undefined);
      assert.ok(init?.body instanceof URLSearchParams);
      assert.deepEqual([...init.body.entries()], [['name', 'ผู้ทดลอง'], ['email', 'demo@example.com'], ['extra', 'ผู้ดูแลเต็นท์']]);
      return new Proxy({} as Response, { get: (_target, property) => property === 'then' ? undefined : assert.fail('opaque response must not be inspected') });
    });
    assert.ok(called);
  });
  it('propagates network failures without logging or exposing the destination', async () => {
    await assert.rejects(submitSignup({ name: 'ทดสอบ', email: 'demo@example.com', extra: 'ช่าง' }, async () => { throw new TypeError('Network failure'); }), TypeError);
  });
});
