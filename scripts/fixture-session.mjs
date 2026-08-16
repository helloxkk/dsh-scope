/**
 * Fixture: write one valid persisted session log with realistic usage events
 * spread over the past year, exercising the real pipeline end to end
 * (zstd frames → backend discovery → readFrom → fold → API → UI).
 *
 * Usage: node scripts/fixture-session.mjs
 */
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { constants, zstdCompress } from 'node:zlib'
import { randomUUID } from 'node:crypto'

const ROOT = join(homedir(), '.dsh', 'sessions')
const ID = 'fixture-lens-001'
const DIR = join(ROOT, '_no-cwd', ID)
const PATH = join(DIR, 'session.jsonl.zstd')
const CHECKSUM = { params: { [constants.ZSTD_c_checksumFlag]: 1 } }

const zstd = (buf) => new Promise((resolve, reject) => {
  zstdCompress(buf, CHECKSUM, (err, out) => (err ? reject(err) : resolve(out)))
})

const DAY = 86_400_000
const now = Date.now()

/** Deterministic pseudo-random in [0,1) from an integer seed. */
const rnd = (seed) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const header = {
  type: 'session',
  version: 0,
  id: ID,
  createdAt: now - 360 * DAY,
  delegationDepth: 0,
}

/** Build usage samples: mostly recent, sparse older months, two models. */
function samples() {
  const rows = []
  let seq = 0
  // Day offsets into the past (365 → today), dense this month.
  const offsets = []
  for (let d = 360; d >= 330; d -= 17) offsets.push(d) // last year's tail
  for (let d = 300; d >= 120; d -= 11) offsets.push(d)
  for (let d = 90; d >= 20; d -= 6) offsets.push(d)
  for (let d = 14; d >= 0; d -= 1) offsets.push(d) // dense fortnight
  let i = 0
  for (const d of offsets) {
    const t = now - d * DAY + Math.floor(rnd(i + 1) * 8) * 3_600_000
    const heavy = rnd(i + 7) > 0.72
    const reasoning = rnd(i + 13) > 0.6
    const model = reasoning ? 'deepseek-reasoner' : 'deepseek-chat'
    const promptTokens = Math.floor(900 + rnd(i + 3) * (heavy ? 28_000 : 6_000))
    const cacheRead = Math.floor(promptTokens * (0.35 + rnd(i + 5) * 0.55))
    const input = promptTokens - cacheRead
    rows.push({
      seq: seq++,
      time: t,
      type: 'request/header',
      data: { turn: i, header: { config: { provider: 'deepseek', model } } },
    })
    rows.push({
      seq: seq++,
      time: t + 2_000,
      type: 'assistant/message',
      data: {
        turn: i,
        step: 0,
        usage: {
          inputTokens: input,
          outputTokens: Math.floor(160 + rnd(i + 11) * (heavy ? 3_400 : 700)),
          cacheReadTokens: cacheRead,
          cacheWriteTokens: Math.floor(rnd(i + 17) * 900),
        },
        message: {
          id: `msg-${randomUUID()}`,
          role: 'assistant',
          source: { kind: 'model', provider: 'deepseek', model },
          content: [{ type: 'text', text: 'fixture reply' }],
        },
      },
    })
    i += 1
  }
  return rows
}

const events = samples()
const headerFrame = await zstd(Buffer.from(`${JSON.stringify(header)}\n`, 'utf8'))
const eventFrame = await zstd(Buffer.from(events.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8'))

await rm(DIR, { recursive: true, force: true })
await mkdir(DIR, { recursive: true })
await writeFile(PATH, Buffer.concat([headerFrame, eventFrame]))

console.log(`fixture written: ${PATH}`)
console.log(`  session ${ID}: ${events.length} events (${events.filter((e) => e.type === 'assistant/message').length} usage samples)`)
console.log(`  span: ${new Date(events[0].time).toISOString().slice(0, 10)} → ${new Date(events.at(-1).time).toISOString().slice(0, 10)}`)
