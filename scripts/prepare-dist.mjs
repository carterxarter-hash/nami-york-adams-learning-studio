import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const dist=path.join(root,'dist');
if(!fs.existsSync(dist)) throw new Error('Vite dist directory does not exist.');

const rawCommit=process.env.COMMIT_REF||process.env.GITHUB_SHA||'local';
const buildId=(rawCommit==='local'?`local-${Date.now().toString(36)}`:rawCommit.slice(0,12)).replace(/[^a-zA-Z0-9._-]/g,'');
const builtAt=new Date().toISOString();

function copyFile(source,destination){const from=path.join(root,source),to=path.join(root,destination);if(!fs.existsSync(from))throw new Error('Required production file is missing: '+source);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);}
copyFile('sw.js','dist/sw.js');
copyFile('manifest.webmanifest','dist/manifest.webmanifest');
copyFile('public/starwars-music-browser.js','dist/starwars-music-browser.js');
copyFile('public/learning-studio-v3.js','dist/learning-studio-v3.js');
copyFile('public/_headers','dist/_headers');

const swPath=path.join(dist,'sw.js');
fs.writeFileSync(swPath,fs.readFileSync(swPath,'utf8').replaceAll('__BUILD_ID__',buildId));

const distIndex=path.join(dist,'index.html');
if(!fs.existsSync(distIndex))throw new Error('Vite dist/index.html does not exist.');
let html=fs.readFileSync(distIndex,'utf8');
if(!html.includes('name="nami-build"'))html=html.replace('</head>',`<meta name="nami-build" content="${buildId}">\n</head>`);
const musicTag=`<script src="./starwars-music-browser.js?v=${buildId}" defer></script>`;
const runtimeTag=`<script src="./learning-studio-v3.js?v=${buildId}" defer></script>`;
if(!html.includes('starwars-music-browser.js'))html=html.replace('</body>',musicTag+'\n</body>');
if(!html.includes('learning-studio-v3.js'))html=html.replace('</body>',runtimeTag+'\n</body>');
fs.writeFileSync(distIndex,html);

fs.writeFileSync(path.join(dist,'build-meta.json'),JSON.stringify({version:'3.0.0',buildId,commit:rawCommit,builtAt,features:['story-mode-unified','background-rotation','event-driven-music','release-integrity']},null,2));

fs.rmSync(path.join(dist,'resources/sw-sfx'),{recursive:true,force:true});
fs.rmSync(path.join(dist,'resources/starwars-embedded-sfx.js'),{force:true});

const iconsSource=path.join(root,'icons'),iconsDestination=path.join(dist,'icons');
if(!fs.existsSync(iconsSource))throw new Error('Required icons directory is missing.');
fs.rmSync(iconsDestination,{recursive:true,force:true});fs.cpSync(iconsSource,iconsDestination,{recursive:true});

const rotationPath=path.join(dist,'resources/sw-video/rotation-v1.json');
if(!fs.existsSync(rotationPath))throw new Error('Background rotation manifest is missing.');
const rotation=JSON.parse(fs.readFileSync(rotationPath,'utf8'));
if(!Array.isArray(rotation.items)||rotation.items.length<2)throw new Error('Background rotation requires at least two clips.');
for(const item of rotation.items){for(const key of ['desktop','mobile']){const rel=String(item[key]||'').replace(/^\.\//,'');if(!rel||!fs.existsSync(path.join(dist,rel)))throw new Error(`Rotation asset missing: ${item.id}.${key}`);}}
console.log(`Prepared Learning Studio build ${buildId} with ${rotation.items.length} rotating Star Wars background clips.`);
