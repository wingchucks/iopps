import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
test('resume URL must identify an owned object in the configured bucket',async()=>{
 const url=new URL('../src/lib/application-resume.ts',import.meta.url);
 assert.ok(existsSync(url),'resume ownership validator missing');
 const {applicationResumePath: path}=await import(url.href);
 assert.equal(path('https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/resumes%2Fu%2Ffile.pdf?alt=media','u','demo.appspot.com'),'resumes/u/file.pdf');
 assert.equal(path('http://127.0.0.1:9199/v0/b/demo.appspot.com/o/resumes%2Fu%2Ffile.pdf','u','demo.appspot.com','127.0.0.1:9199'),'resumes/u/file.pdf');
 assert.throws(()=>path('http://127.0.0.1:9199/v0/b/demo.appspot.com/o/resumes%2Fu%2Ffile.pdf','u','demo.appspot.com'));
 for(const value of ['https://evil.test/resume.pdf','https://firebasestorage.googleapis.com/v0/b/other/o/resumes%2Fu%2Ffile.pdf','https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/resumes%2Fother%2Ffile.pdf']) assert.throws(()=>path(value,'u','demo.appspot.com'));
});
