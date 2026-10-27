const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalize,isStale}=require('../mac/usage.cjs');
test('maps windows by duration, not position',()=>{
 const got=normalize({rateLimits:{primary:{usedPercent:28,windowDurationMins:10080,resetsAt:123},secondary:{usedPercent:9,windowDurationMins:300,resetsAt:456}}},1000);
 assert.equal(got.weekly.usedPercent,28); assert.equal(got.fiveHour.usedPercent,9);
});
test('selects codex bucket and preserves missing five-hour window',()=>{
 const got=normalize({rateLimitsByLimitId:{codex:{primary:{usedPercent:42,windowDurationMins:10080}}}},2000);
 assert.equal(got.weekly.usedPercent,42); assert.equal(got.fiveHour,null);
});
test('clamps percentages and rejects nonnumeric values',()=>{
 assert.equal(normalize({rateLimits:{primary:{usedPercent:110,windowDurationMins:300}}},1).fiveHour.usedPercent,100);
 assert.equal(normalize({rateLimits:{primary:{usedPercent:'12',windowDurationMins:300}}},1).fiveHour,null);
});
test('unknown duration is not mislabelled as 5h',()=>{
 assert.equal(normalize({rateLimits:{primary:{usedPercent:12,windowDurationMins:60}}},1).fiveHour,null);
});
test('missing snapshots and old data are stale',()=>{
 assert.equal(isStale({},200000),true); assert.equal(isStale({updatedAt:1000},181001),true); assert.equal(isStale({updatedAt:1000},1001),false);
});
