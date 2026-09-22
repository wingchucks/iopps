import test from 'node:test';
import assert from 'node:assert/strict';
import { accountDestination } from '../src/lib/sign-in-destination.ts';
import { setupDestination } from '../src/app/setup/destination.ts';
const query = new URLSearchParams();
test('completed member returning through dashboard resolves to feed', () => {
 const destination = accountDestination({hasMemberProfile:true, setupComplete:true});
 assert.equal(setupDestination(destination, query, true), '/feed');
});
test('persisted completion survives a new session without relying on member existence', () => {
 assert.equal(accountDestination({hasMemberProfile:false, setupComplete:true}), '/feed');
});
test('organization intent resumes organization signup ahead of personal profile', () => {
 const destination = accountDestination({hasMemberProfile:true, signupIntent:'organization'});
 assert.equal(destination, '/signup?resume=organization&type=employer');
 assert.equal(setupDestination(destination, query), destination);
});
test('explicit setup revisit stays editable', () => {
 assert.equal(setupDestination('/feed', query), null);
});
