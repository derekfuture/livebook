import {copyFile,writeFile} from 'node:fs/promises';
await copyFile('server/feedback-worker.js','dist/_worker.js');
await writeFile('dist/_routes.json',JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
