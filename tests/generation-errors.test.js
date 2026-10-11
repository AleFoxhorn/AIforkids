import test from 'node:test';
import assert from 'node:assert/strict';
import {isGenerationQuotaError,showGenerationQuotaError} from '../src/generation-errors.js';
test('explicit billing exhaustion opens the modal once',()=>{
 let calls=0;const dialog={open:false,showModal(){this.open=true;calls++;}};
 assert.equal(showGenerationQuotaError({error:{code:'insufficient_quota'}},dialog),true);
 assert.equal(showGenerationQuotaError({code:'insufficient_balance'},dialog),true);
 assert.equal(calls,1);
});
test('rate limit, network, authentication and local storage failures are not billing errors',()=>{
 for(const error of [{status:429},{code:'rate_limit_exceeded'},{status:401},new TypeError('Failed to fetch'),{name:'QuotaExceededError'},null])assert.equal(isGenerationQuotaError(error),false);
});
