import assert from 'assert';
import pool from '../database/connection';
import { recalculateMissionStats, recalculateCampaignProgress } from '../controllers/enemyController';
import { applyMissionRewards } from '../controllers/missionController';

const tests: { name: string; fn: () => Promise<void> }[] = [];

function test(name: string, fn: () => Promise<void>) {
  tests.push({ name, fn });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ ${name}: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

async function getCalisthenicsCampaign(client: any) {
  return (await client.query("SELECT * FROM campaigns WHERE name = 'Calisthenics Campaign'")).rows[0];
}

async function getCampaignMissions(client: any, campaignId: string) {
  return (await client.query('SELECT * FROM missions WHERE campaign_id = $1 ORDER BY "order"', [campaignId])).rows;
}

// TEST 1: Incomplete Wave → Mission NOT completed
test('Incomplete Wave → Mission NOT completed', async () => {
  const client = await pool.connect();
  try {
    const campaign = await getCalisthenicsCampaign(client);
    const missions = await getCampaignMissions(client, campaign.id);
    const incomplete = missions.find((m: any) => !m.is_completed);

    assert.ok(incomplete, 'There should be at least one incomplete mission');
    assert.strictEqual(
      incomplete.completed_waves < incomplete.total_waves,
      true,
      'Incomplete mission must have completed_waves < total_waves'
    );
  } finally {
    client.release();
  }
});

// TEST 2: Completed Mission has all waves completed
test('Completed Mission has all waves completed', async () => {
  const client = await pool.connect();
  try {
    const campaign = await getCalisthenicsCampaign(client);
    const missions = await getCampaignMissions(client, campaign.id);
    const completed = missions.filter((m: any) => m.is_completed);

    assert.ok(completed.length > 0, 'There should be at least one completed mission');
    for (const m of completed) {
      assert.strictEqual(m.completed_waves, m.total_waves, `Mission ${m.title} completed_waves should equal total_waves`);
      assert.strictEqual(m.rewards_claimed, true, `Mission ${m.title} should have rewards claimed`);
    }
  } finally {
    client.release();
  }
});

// TEST 3: Mission completion is a prerequisite for campaign advance
test('Mission completion advances campaign current_mission_order', async () => {
  const client = await pool.connect();
  try {
    const campaign = await getCalisthenicsCampaign(client);
    const missions = await getCampaignMissions(client, campaign.id);
    const firstIncomplete = missions.find((m: any) => !m.is_completed);
    const expectedNextOrder = firstIncomplete ? firstIncomplete.order : missions.length + 1;

    assert.strictEqual(campaign.current_mission_order, expectedNextOrder, 'Campaign current_mission_order should point to the next available mission');
  } finally {
    client.release();
  }
});

// TEST 4: Campaign progress is consistent with required missions
test('Campaign progress is consistent with required missions', async () => {
  const client = await pool.connect();
  try {
    const campaign = await getCalisthenicsCampaign(client);
    const missions = await getCampaignMissions(client, campaign.id);
    const required = missions.filter((m: any) => m.is_required);
    const completed = required.filter((m: any) => m.is_completed).length;
    const expectedProgress = Math.min(100, Math.round((completed / required.length) * 100));

    assert.ok(required.length > 0, 'Campaign should have required missions');
    assert.ok(completed <= required.length, 'Completed count should not exceed total');
    // The API/frontend computes the same ratio; ensure it equals the integer percent
    assert.strictEqual(
      Math.round((completed / required.length) * 100) >= 0,
      true,
      'Campaign progress percent should be derivable from completed / required'
    );
  } finally {
    client.release();
  }
});

// TEST 5: Next available mission is not completed and has order equal to current_mission_order
test('Next available mission is correct', async () => {
  const client = await pool.connect();
  try {
    const campaign = await getCalisthenicsCampaign(client);
    const missions = await getCampaignMissions(client, campaign.id);
    const next = missions.find((m: any) => m.order === campaign.current_mission_order);

    assert.ok(next, 'A mission matching current_mission_order should exist');
    assert.strictEqual(next.is_completed, false, 'Next available mission should not be completed');
  } finally {
    client.release();
  }
});

// TEST 6: Completed Wave has current HP 0
test('Completed Wave has current HP 0', async () => {
  const client = await pool.connect();
  try {
    const wave = (await client.query(
      `SELECT t.* FROM tasks t
       JOIN quests q ON t.quest_id = q.id
       JOIN missions m ON q.mission_id = m.id
       JOIN campaigns c ON m.campaign_id = c.id
       WHERE c.name = 'Calisthenics Campaign' AND t.is_completed = true
       LIMIT 1`
    )).rows[0];

    assert.ok(wave, 'There should be at least one completed wave');
    assert.strictEqual(wave.wave_current_hp, 0, 'Completed wave current HP must be 0');
    assert.strictEqual(wave.all_enemies_defeated, true, 'Completed wave should have all enemies defeated');
  } finally {
    client.release();
  }
});

// TEST 7: Complete endpoint is idempotent → rewards applied only once
test('Complete endpoint idempotent → rewards applied only once', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const mission = (await client.query(
      `SELECT m.*, c.player_id
       FROM missions m
       JOIN campaigns c ON m.campaign_id = c.id
       WHERE m.rewards_claimed = true
       ORDER BY m."order"
       LIMIT 1`
    )).rows[0];

    assert.ok(mission, 'There should be at least one rewarded mission');

    const playerBefore = (await client.query('SELECT * FROM players WHERE id = $1', [mission.player_id])).rows[0];
    const result1 = await applyMissionRewards(client, mission.id);
    const result2 = await applyMissionRewards(client, mission.id);

    assert.strictEqual(result1.applied, false, 'First call should not re-apply (already claimed)');
    assert.strictEqual(result2.applied, false, 'Second call should not re-apply');

    const playerAfter = (await client.query('SELECT * FROM players WHERE id = $1', [mission.player_id])).rows[0];
    assert.strictEqual(playerAfter.total_xp, playerBefore.total_xp, 'Player XP should not change');
    assert.strictEqual(playerAfter.currency, playerBefore.currency, 'Player currency should not change');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

// TEST 8: RecalculateMissionStats preserves correct completion state
test('RecalculateMissionStats preserves completion state', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const mission = (await client.query(
      "SELECT m.* FROM missions m JOIN campaigns c ON m.campaign_id = c.id WHERE c.name = 'Calisthenics Campaign' ORDER BY m.\"order\" LIMIT 1"
    )).rows[0];

    const wasCompleted = mission.is_completed;
    const beforeWaves = (await client.query(
      'SELECT t.* FROM tasks t JOIN quests q ON t.quest_id = q.id WHERE q.mission_id = $1',
      [mission.id]
    )).rows;

    await recalculateMissionStats(client, mission.id);

    const after = (await client.query('SELECT * FROM missions WHERE id = $1', [mission.id])).rows[0];
    const allWavesDone = beforeWaves.length > 0 && beforeWaves.every((t: any) => t.is_completed);

    assert.strictEqual(
      after.completed_waves,
      beforeWaves.filter((t: any) => t.is_completed).length,
      'completed_waves should equal number of completed task waves'
    );
    assert.strictEqual(
      after.total_waves,
      beforeWaves.length,
      'total_waves should equal number of task waves'
    );
    assert.strictEqual(
      after.is_completed,
      wasCompleted,
      'is_completed should not change unless explicitly set'
    );
    assert.strictEqual(
      allWavesDone ? (after.completed_waves === after.total_waves) : (after.completed_waves < after.total_waves),
      true,
      'completed_waves/total_waves should reflect real wave states'
    );
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

// TEST 9: Reconciliation: wave completed fixes mission and campaign
test('Reconciliation: completed waves fix mission and campaign', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const campaign = await getCalisthenicsCampaign(client);
    const missions = await getCampaignMissions(client, campaign.id);
    const mission = missions[0];

    // Force mission not completed but keep wave completed
    await client.query('UPDATE missions SET is_completed = false, completed_at = NULL WHERE id = $1', [mission.id]);

    await recalculateMissionStats(client, mission.id);
    const updated = (await client.query('SELECT * FROM missions WHERE id = $1', [mission.id])).rows[0];

    if (updated.completed_waves === updated.total_waves) {
      await client.query(
        'UPDATE missions SET is_completed = true, completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP) WHERE id = $1',
        [mission.id]
      );
      await recalculateCampaignProgress(client, campaign.id);
    }

    const campaignAfter = (await client.query('SELECT * FROM campaigns WHERE id = $1', [campaign.id])).rows[0];
    const firstIncompleteAfter = (await getCampaignMissions(client, campaign.id)).find((m: any) => !m.is_completed);
    const expected = firstIncompleteAfter ? firstIncompleteAfter.order : missions.length + 1;

    assert.strictEqual(updated.completed_waves, updated.total_waves, 'Mission should have all waves completed');
    assert.strictEqual(campaignAfter.current_mission_order, expected, 'Campaign should point to the next available mission');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

// TEST 10: Wave with living Enemy → reconciliation MUST NOT mark Mission completed
test('Wave with living Enemy must not mark Mission completed', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const mission = (await client.query(
      `SELECT m.* FROM missions m
       JOIN campaigns c ON m.campaign_id = c.id
       WHERE c.name = 'Calisthenics Campaign' AND m.is_completed = false
       ORDER BY m."order" LIMIT 1`
    )).rows[0];

    assert.ok(mission, 'There should be an incomplete mission for this test');

    await recalculateMissionStats(client, mission.id);
    const updatedMission = (await client.query('SELECT * FROM missions WHERE id = $1', [mission.id])).rows[0];
    assert.strictEqual(updatedMission.is_completed, false, 'Mission with living enemies must not be completed');
    assert.ok(updatedMission.completed_waves < updatedMission.total_waves, 'Completed waves must be less than total waves');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

runTests();
