import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { saveDemoSignup, validateSignup, SIGNUP_KEY } from './signup.ts';

describe('landing demo signup', () => {
  it('requires name, valid email and role', () => {
    assert.deepEqual(Object.keys(validateSignup({ name: '', email: 'bad', role: '' })), ['name', 'email', 'role']);
    assert.deepEqual(validateSignup({ name: 'ผู้ทดลอง', email: 'demo@example.com', role: 'ผู้ดูแลเต็นท์' }), {});
  });
  it('saves only the latest signup under a key separate from vehicle storage', () => {
    let storedKey = '', storedValue = '';
    const result = saveDemoSignup({ setItem: (key, value) => { storedKey = key; storedValue = value; } }, { name: ' ผู้ทดลอง ', email: ' Demo@Example.com ', role: ' ผู้ดูแลเต็นท์ ' });
    assert.equal(storedKey, SIGNUP_KEY);
    const saved = JSON.parse(storedValue);
    assert.equal(saved.name, 'ผู้ทดลอง');
    assert.equal(saved.email, 'demo@example.com');
    assert.equal(saved.role, 'ผู้ดูแลเต็นท์');
    assert.equal(saved.schemaVersion, 1);
    assert.equal(saved.submittedAt, result.submittedAt);
    assert.notEqual(SIGNUP_KEY, 'vehicle-inspection-mvp:v1');
  });
  it('does not write invalid submissions and propagates denied storage', () => {
    assert.throws(() => saveDemoSignup({ setItem: () => assert.fail('should not write') }, { name: '', email: 'bad', role: '' }));
    assert.throws(() => saveDemoSignup({ setItem: () => { throw new Error('quota'); } }, { name: 'ทดสอบ', email: 'demo@example.com', role: 'ช่าง' }));
  });
});
