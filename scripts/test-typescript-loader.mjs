import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
registerHooks({resolve(specifier,context,next){
 if(specifier === 'next/server') return next('next/server.js',context);
 let candidate;
 if(specifier.startsWith('@/'))candidate=path.resolve('src',specifier.slice(2));
 else if(specifier.startsWith('.') && context.parentURL)candidate=fileURLToPath(new URL(specifier,context.parentURL));
 if(candidate && !path.extname(candidate) && existsSync(candidate+'.ts'))return next(pathToFileURL(candidate+'.ts').href,context);
 return next(specifier,context);
}});
