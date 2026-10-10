import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Meter } from '../types'

const CLAUDE = '#D97757'
const ACCOUNT = '#6CA6E8'
const SESSION = '#7FBF7F'
const WARN = '#E5C07B'
const DANGER = '#E06C75'
const BAR = 20

const initial: Meter = {
  frame: 0,
  fiveTarget: null,
  sevenTarget: null,
  fiveReset: null,
  sevenReset: null,
  five: 0,
  seven: 0,
  ctx: 0,
  tokensTarget: 0,
  tokens: 0,
  usd: 0,
  isWorking: false,
  happy: 0,
  renewal: null,
  now: 0,
}

const meter = atom({ plugin: 'claude-meter', key: 'meter' } as const, initial)

// 目標値へ少しずつ近づける(アニメーション用)
const ease = (now: number, target: number) => {
  const d = target - now
  return Math.abs(d) < 0.05 ? target : now + d * 0.25
}

const filled = (pct: number) => Math.max(0, Math.min(BAR, Math.round((pct / 100) * BAR)))

const bar = (pct: number) => {
  const n = Math.max(0, Math.min(BAR, Math.round((pct / 100) * BAR)))
  return '█'.repeat(n) + '░'.repeat(BAR - n)
}

// 残りの量を、シンプルな記号と色で知らせる(絵文字は使わない)。
// 残り10%ごとに10段階: 90%以上 → 80% → ... → 10%未満 の順に色が緑から赤へ、記号も変わる
const TIER_COLORS = [
  '#4FD18B', '#7FD99A', '#A6E08A', '#C8E070', '#E6DB5E',
  '#F2C94C', '#F5A25D', '#F28B54', '#EE6B6B', '#E0475B',
]
const TIER_GLYPHS = ['♥', '♥', '♥', '♥', '♡', '♡', '▲', '▲', '!', '☠']

const icon = (left: number, frame: number) => {
  const tier = Math.max(0, Math.min(9, Math.floor((100 - left) / 10)))
  // ほぼ空(3%未満): ドクロと✖がゆっくり入れ替わる
  const ch = left < 3 ? (frame % 8 < 4 ? '☠' : '✖') : TIER_GLYPHS[tier]
  return { ch, color: TIER_COLORS[tier] }
}

const compact = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(2)}M`
    : n >= 1000
      ? `${(n / 1000).toFixed(1)}k`
      : `${Math.round(n)}`

const two = (n: number) => String(n).padStart(2, '0')
const resetAt = (iso: string | null, withDate: boolean) => {
  if (!iso) return ''
  const d = new Date(iso)
  return withDate
    ? `${d.getMonth() + 1}/${d.getDate()}`
    : `${two(d.getHours())}:${two(d.getMinutes())}`
}

export const register: Register = on => {
  let isWorking = false

  on('session.start', async ($, e, next) => {
    // 使用量の取得(アカウントの利用枠・コスト・コンテキスト)
    const poll = async () => {
      const u = await $.session.usage()
      const five = u.rateLimits.find(r => r.kind === 'five_hour')
      const seven = u.rateLimits.find(r => r.kind === 'seven_day')
      const now = await $.clock.now()
      await update($, meter, m => ({
        ...m,
        fiveTarget: five ? five.percentUsed : null,
        sevenTarget: seven ? seven.percentUsed : null,
        fiveReset: five?.resetsAt ?? null,
        sevenReset: seven?.resetsAt ?? null,
        ctx: u.context.percent ?? 0,
        usd: u.cost?.usd ?? 0,
        now,
      }))
    }

    let tick = 0
    // 250msごとに1コマ進める
    $.clock.every(250, async () => {
      tick += 1
      if (tick % 16 === 1) await poll()
      await update($, meter, m => ({
        ...m,
        frame: m.frame + 1,
        isWorking,
        happy: Math.max(0, m.happy - 1),
        five: ease(m.five, m.fiveTarget ?? 0),
        seven: ease(m.seven, m.sevenTarget ?? 0),
        tokens: ease(m.tokens, m.tokensTarget),
      }))
    })

    return next(e)
  })

  on('prompt.submit', ($, e, next) => {
    isWorking = true
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const u = e.usage
    if (u) {
      const add = u.input_tokens + u.output_tokens + u.cache_creation_input_tokens
      await update($, meter, m => ({
        ...m,
        tokensTarget: m.tokensTarget + add,
        isWorking: false,
        happy: 16,
      }))
    }
    isWorking = false
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const m = await read($, meter)
    const { Box, Text } = $.ui.resolve(e)

    const f = m.frame
    const isHappy = m.happy > 0
    // ✻ はClaudeのロゴ。作業中は回り、完了時は ♥
    const mark = isHappy ? '♥' : e.props.isWorking ? ['✻', '✺', '✹', '✸'][f % 4] : '✻'

    // 1行分の枠。列ごとに幅を固定して、記号の幅が違っても上下で揃える
    const windowRow = (label: string, target: number | null, shown: number, reset: string, tail?: unknown, extra = 0) => {
      const used = target === null ? 0 : Math.round(target)
      // バーは基本的にClaudeのオレンジ。残りが10%を切ったときだけ赤にして知らせる
      const barColor = 100 - used < 10 ? DANGER : CLAUDE
      const ic = target === null ? { ch: '♡', color: undefined } : icon(Math.max(0, 100 - used), f)
      return (
        <Box flexDirection="row">
          <Box width={3} flexShrink={0}><Text color={ACCOUNT}>{label}</Text></Box>
          <Box width={3} flexShrink={0}><Text color={ic.color} bold>{ic.ch}</Text></Box>
          <Box width={BAR + 14} flexShrink={0}>
            {/* 埋まり・空きとも同じ █ を使い、色だけで分ける(文字幅が同じなので上下の終端が必ず揃う) */}
            <Text>
              <Text color={barColor}>{'█'.repeat(target === null ? 0 : filled(shown))}</Text>
              <Text color="#C8C8C8">{'█'.repeat(target === null ? BAR : BAR - filled(shown))}</Text>
            </Text>
          </Box>
          <Box width={5} flexShrink={0}>
            {target === null ? <Text dimColor>—</Text> : <Text bold>{String(used).padStart(3)}%</Text>}
          </Box>
          <Box width={6} flexShrink={0}><Text dimColor>{target === null ? '' : `↻${reset}`}</Text></Box>
          {tail}
        </Box>
      )
    }

    // ✻ は表示幅が環境でぶれるので行頭に置かず、1行目の末尾に出す
    const session = (
      <Text>
        <Text dimColor>│ </Text>
        <Text color={SESSION}>Session </Text>
        <Text color={SESSION} bold>{compact(m.tokens)}</Text>
        <Text dimColor> tok </Text>
        <Text color={isHappy ? DANGER : CLAUDE}>{mark}</Text>
      </Text>
    )

    return (
      <Box flexDirection="column">
        {windowRow('5h', m.fiveTarget, m.five, resetAt(m.fiveReset, false), session, 0)}
        {windowRow('7d', m.sevenTarget, m.seven, resetAt(m.sevenReset, true), undefined, 0)}
      </Box>
    )
  })
}
