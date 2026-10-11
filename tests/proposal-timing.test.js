import test from 'node:test';
import assert from 'node:assert/strict';
import {proposalDelay} from '../src/proposal-timing.js';
test('proposal waits for both natural pause and cooldown',()=>{
 assert.equal(proposalDelay(10000,9000,60000,6500),50040);
 assert.equal(proposalDelay(60000,59000,60000,6500),5540);
 assert.equal(proposalDelay(70000,59000,60000,6500),40);
});
