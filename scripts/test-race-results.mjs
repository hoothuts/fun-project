import assert from 'node:assert';
import { getSchedule, getRaceResults } from '../src/api.js';

async function runSelfCheck() {
  console.log('🏁 Running Schedule & Race Results Verification...');

  // 1. Check getSchedule
  const schedule2024 = await getSchedule('2024');
  assert(Array.isArray(schedule2024), 'Schedule should return an array');
  assert(schedule2024.length > 0, '2024 schedule should have races');
  console.log(`✓ 2024 Calendar fetched: ${schedule2024.length} rounds.`);

  // 2. Check getRaceResults for Round 1 (Bahrain)
  const r1Results = await getRaceResults('2024', '1');
  assert(r1Results !== null, 'Race results for 2024 R1 should not be null');
  assert.strictEqual(r1Results.raceName, 'Bahrain Grand Prix');
  assert(r1Results.results.length >= 20, 'Should have 20 classified drivers in 2024 R1');
  
  const winner = r1Results.results[0];
  assert.strictEqual(winner.position, '1');
  assert.strictEqual(winner.driver, 'Max Verstappen');
  assert.strictEqual(winner.constructorId, 'red_bull');
  assert.strictEqual(winner.points, '26');
  assert.strictEqual(winner.isFastestLap, true);
  console.log(`✓ 2024 R1 Bahrain Winner verified: ${winner.driver} (${winner.constructor}) with Fastest Lap!`);

  // 3. Check historical race: 1988 R1 (Brazil)
  const r1988 = await getRaceResults('1988', '1');
  assert(r1988 !== null, '1988 R1 results should exist');
  assert.strictEqual(r1988.raceName, 'Brazilian Grand Prix');
  assert.strictEqual(r1988.results[0].driver, 'Alain Prost');
  assert.strictEqual(r1988.results[0].constructorId, 'mclaren');
  console.log(`✓ 1988 R1 Brazil Winner verified: ${r1988.results[0].driver} (${r1988.results[0].constructor})`);

  console.log('🏁 All Schedule & Race Results checks passed successfully!');
}

runSelfCheck().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
