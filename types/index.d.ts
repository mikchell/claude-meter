export type Meter = {
  /** アニメーションのコマ番号 */
  frame: number
  /** 各枠の使用率(目標値)。取得できなければ null */
  fiveTarget: number | null
  sevenTarget: number | null
  /** 各枠のリセット時刻(ISO 8601) */
  fiveReset: string | null
  sevenReset: string | null
  /** 表示中の値(目標へ滑らかに近づく) */
  five: number
  seven: number
  ctx: number
  /** このセッションのトークン合計(目標値)と表示値 */
  tokensTarget: number
  tokens: number
  usd: number
  isWorking: boolean
  /** ターン完了のお祝いが続く残りコマ数 */
  happy: number
  /** 契約の更新日(YYYY-MM-DD)。未設定なら null */
  renewal: string | null
  /** 日数計算に使う現在時刻(ms) */
  now: number
}

declare module 'claude-code' {
  interface PluginState {
    'claude-meter': { meter: Meter }
  }
}
