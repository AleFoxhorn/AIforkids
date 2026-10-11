const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function changesBetween(before, after) {
  const a = new Map(before.map(p => [p.id, p])), b = new Map(after.map(p => [p.id, p]));
  const commonBefore=before.filter(p=>b.has(p.id)).map(p=>p.id),commonAfter=after.filter(p=>a.has(p.id)).map(p=>p.id);
  return [...new Set([...a.keys(), ...b.keys()])].filter(id => !same(a.get(id), b.get(id)) || commonBefore.indexOf(id)!==commonAfter.indexOf(id))
    .map(id => ({ before: a.get(id), after: b.get(id), orderOnly:same(a.get(id),b.get(id)), beforeIndex: before.findIndex(p => p.id === id), afterIndex: after.findIndex(p => p.id === id) }));
}
// Apply only this transaction's IDs, never replace concurrent work wholesale.
export function applyChanges(pieces, changes, back) {
  const ids = new Set(changes.map(c => (c.before || c.after).id));
  const result = pieces.filter(p => !ids.has(p.id));
  const key = back ? 'before' : 'after', index = back ? 'beforeIndex' : 'afterIndex';
  changes.filter(c => c[key]).sort((a,b) => a[index] - b[index]).forEach(c => {
    const value=c.orderOnly?pieces.find(p=>p.id===c[key].id):c[key];
    if(value)result.splice(Math.max(0, Math.min(c[index], result.length)), 0, { ...value });
  });
  return result;
}
