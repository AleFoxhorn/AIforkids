import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMaterial, providerError, safeResultUrl, materialApi } from '../server/material-generation.js';
import { removeKeyBackground } from '../src/material-generation.js';
import { Readable } from 'node:stream';

test('billing, authentication and rate limits remain distinct', () => {
  assert.equal(providerError(400, {code:'Arrearage'}).code, 'insufficient_quota');
  assert.equal(providerError(403, {code:'AllocationQuota.FreeTierOnly'}).code, 'insufficient_quota');
  assert.equal(providerError(401, {}).code, 'invalid_api_key');
  assert.equal(providerError(429, {code:'Throttling.AllocationQuota'}).code, 'rate_limit');
});
test('download accepts only provider result URLs', () => {
  assert.ok(safeResultUrl('https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/a.png?token=x'));
  for (const url of ['http://127.0.0.1/a', 'https://example.com/a', 'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com.evil.test/a', 'https://user@dashscope-result-bj.oss-cn-beijing.aliyuncs.com/a']) assert.equal(safeResultUrl(url), false);
});
test('pipeline recognizes subject, makes one edit and downloads without forwarding key', async () => {
  const calls = [];
  const result = await generateMaterial({image:'data:image/png;base64,YQ==',key:'test-secret'}, async (url, options) => {
    calls.push({url, options});
    if (calls.length === 1) return Response.json({choices:[{message:{content:JSON.stringify({subject:'leaf',anchors:['round'],palette:['green']})}}]});
    if (calls.length === 2) return Response.json({output:{choices:[{message:{content:[{image:'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/test.png'}]}}]}});
    return new Response(new Uint8Array([1,2,3]), {headers:{'content-type':'image/png'}});
  });
  assert.equal(calls.length, 3); assert.equal(JSON.parse(calls[1].options.body).model, 'qwen-image-edit-plus');
  assert.equal(JSON.parse(calls[1].options.body).parameters.n, 1);
  assert.equal(calls[2].options.headers, undefined); assert.equal(result.image, 'data:image/png;base64,AQID');
});
test('bad credentials stop before image generation without automatic retry', async () => {
  let calls=0;
  await assert.rejects(generateMaterial({image:'data:image/png;base64,YQ==',key:'bad'}, async()=>{calls++;return Response.json({error:{code:'invalid_api_key'}},{status:401});}), {code:'invalid_api_key'});
  assert.equal(calls,1);
});
test('missing key and invalid subject cannot initiate image generation', async () => {
  await assert.rejects(generateMaterial({image:'data:image/png;base64,YQ=='}),{code:'missing_key'});
  let calls=0;
  await assert.rejects(generateMaterial({image:'data:image/png;base64,YQ==',key:'x'},async()=>{calls++;return Response.json({choices:[{message:{content:'not JSON'}}]});}),{code:'recognition_failed'});
  assert.equal(calls,1);
});
test('cross-origin requests cannot spend credits', async()=>{
  const request=Readable.from([]);request.url='/api/materials/generate';request.method='POST';request.headers={host:'127.0.0.1:5173',origin:'https://evil.test','content-type':'application/json'};
  let status;await materialApi('test')(request,{writeHead(s){status=s;},end(){}},()=>assert.fail());assert.equal(status,403);
});
test('key cleanup preserves white tape and creates real alpha', () => {
  const data=new Uint8ClampedArray(5*5*4);for(let i=0;i<25;i++)data.set([255,0,255,255],i*4);data.set([245,240,220,255],12*4);
  removeKeyBackground(data,5,5);assert.equal(data[3],0);assert.equal(data[12*4+3],255);
  const opaque=new Uint8ClampedArray(100).fill(255);assert.throws(()=>removeKeyBackground(opaque,5,5));
});
