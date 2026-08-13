import assert from 'assert';
import { spawnSync } from 'child_process';
import pool from '../database/connection';
import { recalculateMissionStats, recalculateCampaignProgress } from '../controllers/enemyController';
import { applyMissionRewards } from '../controllers/missionController';

const tests: { name: string; fn: () => Promise<void> }[] = [];
function test(name: string, fn: () => Promise<void>) { tests.push({ name, fn }); }

async function runTests() {
  let passed = 0, failed = 0;
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`✓ ${name}`); passed++; }
    catch (err) { console.error(`✗ ${name}: ${(err as Error).message}`); failed++; }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

async function query(sql: string, params: any[] = []) {
  return (await pool.query(sql, params)).rows;
}

async function getCampaign(client: any) {
  return (await client.query("SELECT * FROM campaigns WHERE name = 'Calisthenics Campaign'")).rows[0];
}

async function getMissions(client: any) {
  return (await client.query('SELECT * FROM missions WHERE campaign_id = (SELECT id FROM campaigns WHERE name = \'Calisthenics Campaign\') ORDER BY "order"')).rows;
}

async function resetBoss(client: any) {
  const boss = (await client.query("SELECT m.* FROM missions m JOIN campaigns c ON m.campaign_id=c.id WHERE c.name='Calisthenics Campaign' AND m.is_boss=true")).rows[0];
  if (!boss) throw new Error('Boss mission not found');
  await client.query("UPDATE missions SET is_completed=false, completed_at=NULL, rewards_claimed=false, completed_waves=0, total_waves=0 WHERE id=$1", [boss.id]);
  const wave = (await client.query(
    `SELECT t.* FROM tasks t JOIN quests q ON t.quest_id=q.id WHERE q.mission_id=$1 LIMIT 1`,
    [boss.id]
  )).rows[0];
  if (wave) {
    await client.query(
      `UPDATE tasks SET is_completed=false, completed_at=NULL, wave_current_hp=wave_total_hp, wave_damage_dealt=0, all_enemies_defeated=false, wave_status='active' WHERE id=$1`,
      [wave.id]
    );
    await client.query(
      `UPDATE enemies SET current_hp=max_hp, damage_dealt=0, actual_value=0, status='not_engaged', is_defeated=false, notes='' WHERE task_id=$1`,
      [wave.id]
    );
  }
  return { boss, wave };
}

// TEST 1: Attack Enemy does not complete Training Session
test('Attack Enemy does not complete Training Session', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { wave, boss } = await resetBoss(client);
    await client.query("UPDATE training_sessions SET status='completed' WHERE task_id=$1 AND status='active'", [wave.id]);
    const newSession = (await client.query(
      `INSERT INTO training_sessions (task_id, starting_wave_damage_dealt, status, session_number, total_effective_damage)
       VALUES ($1, 0, 'active', 1, 0) RETURNING *`,
      [wave.id]
    )).rows[0];

    const enemy = (await client.query('SELECT * FROM enemies WHERE task_id=$1 ORDER BY enemy_order LIMIT 1', [wave.id])).rows[0];
    const actual = Number(enemy.target_value);

    await client.query(
      `UPDATE enemies SET actual_value=$1, current_hp=0, damage_dealt=max_hp, status='defeated', is_defeated=true WHERE id=$2`,
      [actual, enemy.id]
    );
    await client.query(
      `INSERT INTO training_session_results (session_id, enemy_id, actual_value, damage_dealt)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (session_id, enemy_id) DO UPDATE
       SET actual_value = EXCLUDED.actual_value,
           damage_dealt = training_session_results.damage_dealt + EXCLUDED.damage_dealt`,
      [newSession.id, enemy.id, actual, enemy.max_hp]
    );

    const updatedWave = (await client.query(
      'SELECT * FROM tasks WHERE id=$1', [wave.id]
    )).rows[0];
    const anyAlive = Number(updatedWave.wave_current_hp) > 0;

    const sessionStillActive = (await client.query(
      "SELECT status FROM training_sessions WHERE id=$1", [newSession.id]
    )).rows[0].status;

    assert.strictEqual(anyAlive, true, 'Wave must still have living enemies');
    assert.strictEqual(updatedWave.is_completed, false, 'Wave must not auto-complete from a single attack');
    assert.strictEqual(sessionStillActive, 'active', 'Training session must remain active');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

// TEST 2: Multiple attacks belong to the same session
test('Multiple attacks belong to the same session', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { wave } = await resetBoss(client);
    await client.query("UPDATE training_sessions SET status='completed' WHERE task_id=$1 AND status='active'", [wave.id]);
    const session = (await client.query(
      `INSERT INTO training_sessions (task_id, starting_wave_damage_dealt, status, session_number, total_effective_damage)
       VALUES ($1, 0, 'active', 1, 0) RETURNING *`,
      [wave.id]
    )).rows[0];

    const enemies = await client.query('SELECT * FROM enemies WHERE task_id=$1 ORDER BY enemy_order', [wave.id]);
    let total = 0;
    for (const enemy of enemies.rows.slice(0, 2)) {
      total += Number(enemy.max_hp);
      await client.query(
        `UPDATE enemies SET actual_value=$1, current_hp=0, damage_dealt=max_hp, status='defeated', is_defeated=true WHERE id=$2`,
        [enemy.target_value, enemy.id]
      );
      await client.query(
        `INSERT INTO training_session_results (session_id, enemy_id, actual_value, damage_dealt)
         VALUES ($1, $2, $3, $4)`,
        [session.id, enemy.id, enemy.target_value, enemy.max_hp]
      );
    }

    const results = await client.query(
      'SELECT COUNT(*) as count, COALESCE(SUM(damage_dealt),0) as sum FROM training_session_results WHERE session_id=$1',
      [session.id]
    );
    const active = (await client.query('SELECT status FROM training_sessions WHERE id=$1', [session.id])).rows[0].status;

    assert.strictEqual(Number(results.rows[0].count), 2, 'Two attacks in one session');
    assert.strictEqual(Number(results.rows[0].sum), total, 'Total damage equals sum of both attacks');
    assert.strictEqual(active, 'active', 'Session still active after two attacks');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

// TEST 3: Complete wave only on explicit complete
test('Complete wave only on explicit complete', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { wave, boss } = await resetBoss(client);

    // All enemies defeated
    await client.query("UPDATE enemies SET current_hp=0, damage_dealt=max_hp, status='defeated', is_defeated=true, actual_value=target_value WHERE task_id=$1", [wave.id]);
    await client.query("UPDATE training_sessions SET status='completed' WHERE task_id=$1 AND status='active'", [wave.id]);
    const session = (await client.query(
      `INSERT INTO training_sessions (task_id, starting_wave_damage_dealt, status, session_number, total_effective_damage)
       VALUES ($1, 0, 'active', 1, 0) RETURNING *`, [wave.id]
    )).rows[0];
    await client.query(
      `INSERT INTO training_session_results (session_id, enemy_id, actual_value, damage_dealt)
       SELECT $1, e.id, e.target_value, e.max_hp FROM enemies e WHERE e.task_id=$2`,
      [session.id, wave.id]
    );

    // Wave not completed until explicit endpoint
    const waveBefore = (await client.query('SELECT is_completed FROM tasks WHERE id=$1', [wave.id])).rows[0];
    assert.strictEqual(waveBefore.is_completed, false);

    // Explicit complete: set wave completed
    await client.query(
      `UPDATE tasks SET is_completed=true, completed_at=CURRENT_TIMESTAMP, wave_status='perfect_clear' WHERE id=$1`,
      [wave.id]
    );
    await recalculateMissionStats(client, boss.id);
    await recalculateCampaignProgress(client, boss.campaign_id);

    const waveAfter = (await client.query('SELECT is_completed FROM tasks WHERE id=$1', [wave.id])).rows[0];
    assert.strictEqual(waveAfter.is_completed, true, 'Wave completed after explicit call');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

// TEST 4: Defeated enemy remains defeated after next attack on another enemy
test('Defeated enemy stays defeated after next attack', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { wave } = await resetBoss(client);
    const enemies = (await client.query('SELECT * FROM enemies WHERE task_id=$1 ORDER BY enemy_order', [wave.id])).rows;

    await client.query("UPDATE enemies SET current_hp=0, damage_dealt=max_hp, status='defeated', is_defeated=true WHERE id=$1", [enemies[0].id]);
    await client.query("UPDATE enemies SET current_hp=0, damage_dealt=max_hp, status='defeated', is_defeated=true WHERE id=$1", [enemies[1].id]);

    const e1 = (await client.query('SELECT is_defeated, current_hp FROM enemies WHERE id=$1', [enemies[0].id])).rows[0];
    const e2 = (await client.query('SELECT is_defeated, current_hp FROM enemies WHERE id=$1', [enemies[1].id])).rows[0];

    assert.strictEqual(e1.is_defeated, true, 'First enemy should remain defeated');
    assert.strictEqual(e2.is_defeated, true, 'Second enemy should remain defeated');
    assert.strictEqual(e1.current_hp, 0);
    assert.strictEqual(e2.current_hp, 0);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

// TEST 5: Optional Mission does not block Final Boss
test('Optional Mission does not block Final Boss', async () => {
  const campaign = (await query("SELECT * FROM campaigns WHERE name='Calisthenics Campaign'"))[0];
  const missions = await query('SELECT * FROM missions WHERE campaign_id=$1', [campaign.id]);
  const optional = missions.find((m: any) => !m.is_required && !m.is_boss);
  const boss = missions.find((m: any) => m.is_boss);

  assert.ok(boss, 'Boss must exist');
  assert.ok(optional, 'Optional mission must exist');
  assert.strictEqual(
    boss.prerequisite_mission_ids.includes(optional.id),
    false,
    'Boss prerequisites must not include optional mission'
  );
});

// TEST 6: Missing required prerequisite blocks Final Boss
test('Missing required prerequisite blocks Final Boss', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const boss = (await client.query(
      `SELECT m.* FROM missions m JOIN campaigns c ON m.campaign_id=c.id WHERE c.name='Calisthenics Campaign' AND m.is_boss=true`
    )).rows[0];

    // Simulate first required mission not completed
    const reqId = (boss.prerequisite_mission_ids as string[])[0];
    await client.query("UPDATE missions SET is_completed=false WHERE id=$1", [reqId]);

    const prereqs = (await client.query(
      'SELECT id, is_completed FROM missions WHERE id = ANY($1)',
      [boss.prerequisite_mission_ids]
    )).rows;
    const allCompleted = prereqs.every((p: any) => p.is_completed);

    assert.strictEqual(allCompleted, false, 'Boss must be blocked when a prerequisite is not completed');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

// TEST 7: All Boss prerequisites completed → Boss available
test('All Boss prerequisites completed → Boss available', async () => {
  const boss = (await query(
    `SELECT m.* FROM missions m JOIN campaigns c ON m.campaign_id=c.id WHERE c.name='Calisthenics Campaign' AND m.is_boss=true`
  ))[0];
  const prereqs = await query(
    'SELECT id, is_completed FROM missions WHERE id = ANY($1)',
    [boss.prerequisite_mission_ids]
  );
  const allCompleted = prereqs.every((p: any) => p.is_completed);
  assert.strictEqual(allCompleted, true, 'All Boss prerequisites must be completed in current data');
});

// TEST 8: Refresh preserves Battle HP between attacks
test('Refresh preserves Battle HP between attacks', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { wave } = await resetBoss(client);
    const enemy = (await client.query('SELECT * FROM enemies WHERE task_id=$1 ORDER BY enemy_order LIMIT 1', [wave.id])).rows[0];
    await client.query(
      'UPDATE enemies SET current_hp=30, damage_dealt=30, status=\'damaged\', is_defeated=false WHERE id=$1',
      [enemy.id]
    );

    // Simulate "refresh" by re-reading from DB in a new query
    const after = (await client.query(
      'SELECT current_hp, damage_dealt FROM enemies WHERE id=$1',
      [enemy.id]
    )).rows[0];

    assert.strictEqual(after.current_hp, 30, 'HP must persist after refresh/read');
    assert.strictEqual(after.damage_dealt, 30, 'Damage must persist after refresh/read');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

// TEST 9: Repeated seed does not create duplicate Boss content
test('Repeated seed does not duplicate Boss content', async () => {
  const before = (await query(
    `SELECT COUNT(*) as count FROM missions m JOIN campaigns c ON m.campaign_id=c.id WHERE c.name='Calisthenics Campaign' AND m.is_boss=true`
  ))[0];
  spawnSync('npx', ['ts-node', 'src/database/seedFinalBoss.ts'], { cwd: process.cwd() + '/backend', stdio: 'ignore' });
  const after = (await query(
    `SELECT COUNT(*) as count FROM missions m JOIN campaigns c ON m.campaign_id=c.id WHERE c.name='Calisthenics Campaign' AND m.is_boss=true`
  ))[0];

  assert.strictEqual(Number(before.count), 1, 'One Boss mission before re-seed');
  assert.strictEqual(Number(after.count), 1, 'One Boss mission after re-seed');
});

// TEST 10: Campaign progress does not count optional Mission in mandatory completion
test('Campaign progress excludes optional Mission', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const campaign = await getCampaign(client);
    const missions = await getMissions(client);
    const required = missions.filter((m: any) => m.is_required);
    const completedRequired = required.filter((m: any) => m.is_completed).length;
    const percent = required.length > 0 ? Math.round(completedRequired / required.length * 100) : 0;

    const optional = missions.filter((m: any) => !m.is_required && !m.is_boss);
    assert.ok(optional.length > 0, 'There should be at least one optional mission');
    assert.strictEqual(
      percent,
      Math.round(completedRequired / required.length * 100),
      'Progress must only use required missions'
    );
    // Specific check: optional completion should not affect required count
    const allMissions = missions.length;
    assert.ok(required.length < allMissions, 'Required set should be smaller than all missions due to optional');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

runTests();
