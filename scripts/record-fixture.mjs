// 保存官方原始响应和校验摘要，供离线测试复用；不访问官方计算器表单。
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { SOURCE_URL } from '../src/index.mjs';

const url = new URL(SOURCE_URL);
url.searchParams.set('filter', 'redemp_period:eq:2023-05');
url.searchParams.set('page[size]', '1000');
url.searchParams.set('sort', 'src_line_nbr');
const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const body = await response.text();
const payload = JSON.parse(body);
if (!payload.data?.length || payload.data.length !== payload.meta?.['total-count']) throw new Error('Incomplete official fixture.');
const directory = new URL('../tests/fixtures/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('treasury-2023-05.json', directory), body);
await writeFile(new URL('source.json', directory), `${JSON.stringify({ sourceUrl: url.href, retrievedAt: new Date().toISOString(), verifiedOn: '2026-11-07', sha256: createHash('sha256').update(body).digest('hex'), rows: payload.data.length }, null, 2)}\n`);
console.log({ rows: payload.data.length, sourceUrl: url.href });
