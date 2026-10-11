// Offline, deliberately conservative extraction. Never claim general language understanding.
export function extractFacts(text) {
  const facts=[];
  for(const clause of text.split(/[，,。！!？?；;\n]|因为|但是|而是/)) {
    if(/可能|也许|如果|假如|不是|并非/.test(clause))continue;
    const scene=clause.match(/(?:这里|这儿|这个场景|这个画板|这)(?:其实)?(?:是|在)(?:一个|个)?\s*([^，。!?！？]{1,20})/);
    if(scene){let value=scene[1].trim().replace(/(?:的场景|的世界|场景|世界)$/,'').replace(/^(?:一个|个)/,'');if(value&&!/不能|不可以|不要/.test(value))facts.push({key:'scene',value});}
    const ban=clause.match(/(?:不能有|不可以有|不要有|没有)(小鸟|鸟|小鱼|鱼|花朵|花)/)||clause.match(/(小鸟|鸟|小鱼|鱼|花朵|花)(?:不能|不可以)(?:出现|加入|在)/);
    if(ban)facts.push({key:'exclude:'+ban[1].replace(/^小/,'').replace('花朵','花'),value:true});
  }
  return facts;
}
export function mergeFacts(old,incoming){const map=new Map(old.map(f=>[f.key,f]));for(const f of incoming)map.set(f.key,f);return [...map.values()];}
export function migrateFacts(memories){return (memories||[]).reduce((all,m)=>mergeFacts(all,typeof m==='string'?extractFacts(m):m?.key?[m]:[]),[]);}
export function describeFact(f){return f.key==='scene'?`场景：${f.value}`:f.key.startsWith('exclude:')?`场景中不加入${f.key.slice(8)}`:'';}
export function suggestionKind(facts){const scene=facts.find(f=>f.key==='scene')?.value||'';const order=/海|水|河|湖/.test(scene)?['fish','bird']:['bird','fish'];return order.find(kind=>!facts.some(f=>f.key===`exclude:${kind==='bird'?'鸟':'鱼'}`))||null;}
export function suggestionText(kind){return `我想用两片叶子和一颗纽扣，拼一只${kind==='fish'?'小鱼':'小鸟'}，可以加入这里吗？`;}
