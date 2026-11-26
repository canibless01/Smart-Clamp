import {readdirSync,readFileSync,statSync,existsSync} from 'node:fs';
import {join,extname} from 'node:path';
const roots=['app','components','lib','data','emails','content','messages','public','../../api/app'];
const extensions=new Set(['.ts','.tsx','.js','.jsx','.json','.md','.mdx','.html','.css','.txt','.py']);
const bad=/[\p{Extended_Pictographic}\u2190-\u21FF\u2700-\u27BF\u2B00-\u2BFF\uFE0F\u20E3\u23FB\u25C9]/u;
let hits=0;
function walk(dir){for(const name of readdirSync(dir)){const full=join(dir,name);if(statSync(full).isDirectory()){if(!['node_modules','.next','__pycache__'].includes(name))walk(full);continue;}if(!extensions.has(extname(full)))continue;readFileSync(full,'utf8').split('\n').forEach((line,i)=>{if(bad.test(line)){hits++;console.log(`${full}:${i+1} ${line.trim().slice(0,125)}`);}});}}
roots.filter(existsSync).forEach(walk);
console.log(hits?`${hits} symbol violations`:'No emoji or symbol glyphs found in product sources.');process.exitCode=hits?1:0;
