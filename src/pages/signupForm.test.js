import {test} from 'node:test';
import assert from 'node:assert/strict';
import {signupRequest,signupErrorMessage} from './signupForm.js';
const values={user_name:'  여행 친구  ',email:'  traveler@example.com  ',password:'test-password-123',passwordConfirm:'test-password-123',agreement:'accepted'};
test('signup maps the profile name to Auth metadata and omits generated ID and confirmation fields',()=>{
 assert.deepEqual(signupRequest(values),{email:'traveler@example.com',password:'test-password-123',options:{data:{name:'여행 친구'}}});
});
test('signup rejects empty or oversized profile names, invalid email, short password, mismatch and missing agreement',()=>{
 for(const patch of [{user_name:'  '},{user_name:'가'.repeat(101)},{email:'bad email'},{password:'short'},{passwordConfirm:'different'},{agreement:undefined}]) assert.throws(()=>signupRequest({...values,...patch}));
 assert.equal(signupRequest({...values,user_name:'가'.repeat(100)}).options.data.name.length,100);
});
test('signup displays Korean errors without exposing raw server diagnostics',()=>{
 assert.match(signupErrorMessage({code:'email_exists'}),/이미 가입/);
 assert.match(signupErrorMessage({code:'over_email_send_rate_limit'}),/잠시 후/);
 assert.doesNotMatch(signupErrorMessage({message:'private database diagnostic'}),/private/);
});
