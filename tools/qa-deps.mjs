// QA 的依赖可以装在项目里，也可以沿用已有的共享工具缓存。
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const paths = [fileURLToPath(new URL('../', import.meta.url)), path.join(homedir(), '.cache/livebook-tools'), '/tmp/lbshot'];
export const requireTool = name => require(require.resolve(name, { paths }));
