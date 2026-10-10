# claude-meter

Claude Code の入力欄の上に、使用量を常に表示するバーです。

<img width="830" height="169" alt="image" src="https://github.com/user-attachments/assets/417a5643-5eed-4e9a-8efc-e140c590aa9b" />

## 作った理由

Pro プランを契約していて、あとどのくらい使えるかを知るには、毎回アカウント設定を見に行く必要があった。
常に目に入るようにして、使用量を意識しながら節約して使えるようにするために作った。

## 見方

| 表示 | 意味 |
|---|---|
| 5h / 7d | 5時間枠・7日枠の使用率。バーは20マスで1マス = 5%。↻ はリセット時刻 / 日付 |
| ♥ → ☠ | 残りが減るほど記号と色が変わる(10段階)。残り10%未満でバーが赤くなる |
| Session | このセッションで使ったトークン量 |

- Pro / Max などのサブスクリプション利用者向けです(API キー利用では「—」と表示)。
- 外部への送信はありません。Claude Code が持つ使用量の情報を表示するだけです。

## インストール

```
/plugin install claude-meter --marketplace mikchell/claude-meter
```

「マーケットプレイスを追加しますか?」と聞かれたら `y`、スコープは `user` を選びます。

## アンインストール

```
/plugin uninstall claude-meter
```

マーケットプレイスも消す場合は、続けて `claude plugin marketplace remove claude-meter` を実行します。

## ライセンス

MIT
