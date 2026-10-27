'use strict';
function normalize(result, now=Date.now()) {
 const bucket=result.rateLimitsByLimitId?.codex ?? result.rateLimits ?? {};
 const windows=[bucket.primary,bucket.secondary].filter(Boolean);
 function pick(duration){
  const w=windows.find(w=>w.windowDurationMins===duration);
  if(!w || typeof w.usedPercent!=='number' || !Number.isFinite(w.usedPercent)) return null;
  return {usedPercent:Math.max(0,Math.min(100,w.usedPercent)),resetsAt:Number.isFinite(w.resetsAt)?w.resetsAt:null,windowDurationMins:duration};
 }
 return {fiveHour:pick(300),weekly:pick(10080),updatedAt:now,status:'ready'};
}
function isStale(snapshot,now=Date.now()){return !snapshot.updatedAt || now-snapshot.updatedAt>180000;}
module.exports={normalize,isStale};
