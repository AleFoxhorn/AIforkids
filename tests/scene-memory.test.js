import test from 'node:test';
import assert from 'node:assert/strict';
import {extractFacts,migrateFacts,mergeFacts,suggestionKind} from '../src/scene-memory.js';
test('extract explicit scene without keeping refusal wording',()=>assert.deepEqual(extractFacts('不可以这是一个海底世界'),[{key:'scene',value:'海底'}]));
test('ignore refusal, uncertain and negated scenes',()=>{for(const s of ['不要','不可以','这里不是海底世界','这里可能是海底','如果这里是海底'])assert.deepEqual(extractFacts(s),[]);});
test('explicit ban and scene facts guide a concrete next proposal',()=>{const f=extractFacts('鸟不能出现在这里，因为这是一个海底世界');assert.equal(suggestionKind(f),'fish');assert.ok(f.some(x=>x.key==='exclude:鸟'));});
test('migration and correction replace the scene without storing raw text',()=>{const f=migrateFacts(['不可以这是一个海底世界']);assert.deepEqual(mergeFacts(f,extractFacts('这里是森林')), [{key:'scene',value:'森林'}]);});
