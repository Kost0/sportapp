import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { PGlite } from '@electric-sql/pglite';

const base = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, base), 'utf8');
const activity = read('services/activities/internal/repository/repository.go');
const profile = read('services/user-profiles/internal/repository/repository.go');
const rawQueries = source => [...source.matchAll(/`([^`]+)`/g)].map(match => match[1]);
const find = (source, pattern) => {
  const sql = rawQueries(source).find(sql => pattern.test(sql));
  assert(sql, `Missing SQL ${pattern}`); return sql;
};
const db = new PGlite();
await db.exec(find(activity, /CREATE TABLE IF NOT EXISTS activities/));
await db.exec(find(activity, /CREATE TABLE IF NOT EXISTS activities/));
await db.exec(find(profile, /CREATE TABLE IF NOT EXISTS user_profiles/));
const user = '11111111-1111-4111-8111-111111111111';
const tomorrow = (await db.query("select (current_date + interval '1 day 18 hours') as date")).rows[0].date;
const insert = find(activity, /INSERT INTO activities/);
const participants = find(activity, /INSERT INTO participants.*activity_id/s);
const args = [user, 'Regression run', 'running', 55.75, 37.61, 'Test park', tomorrow, 2, 1, '', 'retry'];
let firstId;
for (let index = 0; index < 2; index++) {
  await db.transaction(async tx => {
    const created = (await tx.query(insert, args)).rows[0];
    firstId ??= created.activity_id;
    assert.equal(created.activity_id, firstId);
    assert.equal(created.spots_left, 1);
    await tx.query(participants, [created.activity_id, user]);
  });
}
assert.equal((await db.query('select count(*)::int as count from activities')).rows[0].count, 1);
assert.equal((await db.query('select count(*)::int as count from participants')).rows[0].count, 1);

const where = find(activity, /^WHERE \(NULLIF/);
const dateClauses = [...activity.matchAll(/case "([^"]*)":\s+dateWhere = "([^"]+)"/g)];
for (const [, filter, clause] of dateClauses) {
  const result = await db.query('SELECT count(*)::int as count FROM activities ' + where + clause, ['', '', '', '']);
  const rows = await db.query('SELECT activity_id FROM activities ' + where + clause + ' ORDER BY date ASC, activity_id ASC LIMIT $5 OFFSET $6', ['', '', '', '', 20, 0]);
  assert.equal(rows.rows.length, result.rows[0].count);
  if (filter === 'tomorrow') assert.equal(rows.rows.length, 1);
  if (filter === 'today') assert.equal(rows.rows.length, 0);
}
await db.query('SELECT activity_id FROM activities ' + where, ['', '', '2026-12-31', '']);
const versionSql = find(activity, /INSERT INTO user_activity_versions/);
const version1 = (await db.query(versionSql, [user])).rows[0].version;
const version2 = (await db.query(versionSql, [user])).rows[0].version;
assert.equal(BigInt(version2), BigInt(version1) + 1n);
const upsert = find(profile, /INSERT INTO user_profiles/);
await db.query(upsert, [user, 'Tester', null, 'OTHER', '2000-02-29', '["running"]', true, true, true]);
await db.query(upsert, [user, 'Tester', null, null, null, '[]', false, false, false]);
assert.equal((await db.query('select favorite_sports from user_profiles')).rows[0].favorite_sports, '["running"]');
await db.query(upsert, [user, 'Tester', null, null, null, '[]', true, true, true]);
const cleared = (await db.query('select birth_date, gender, favorite_sports from user_profiles')).rows[0];
assert.deepEqual(cleared, { birth_date: null, gender: null, favorite_sports: '[]' });
console.log('PASS: PostgreSQL migrations, retry idempotency, organizer seat, all date filters, query totals, collection versions, omitted profile fields and explicit clears.');
await db.close();
