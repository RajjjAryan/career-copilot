# career-copilot — 日本語モード (`modes/ja/`)

このフォルダには、career-copilotの主要モードの日本語翻訳が含まれています。日本市場で求職活動をしている方、または日本語の求人票に対応する方を対象としています。

## いつこのモードを使うか？

以下のいずれかに該当する場合、`modes/ja/` を使用してください：

- 主に**日本語の求人**に応募している（Wantedly、Green、ビズリーチ、リクナビNEXT、doda、マイナビ転職、Gupy JP、LinkedIn JP、企業の採用ページ）
- **履歴書・職務経歴書が日本語**、または求人に合わせて日本語と英語を使い分けている
- **自然なテック日本語**での回答や書類作成が必要（機械翻訳ではなく）
- **日本市場特有の雇用条件**に対応する必要がある：正社員 vs 契約社員 vs 業務委託、みなし残業、ボーナス（賞与）、退職金制度、社会保険、有給休暇、試用期間

求人の大半が英語の場合は、`modes/` の標準モードを使ってください。英語モードでも日本語求人は自動検出しますが、日本市場の細かいニュアンスまではカバーしていません。

## 有効化の方法

career-copilotにはコード上の「言語スイッチ」はありません。代わりに2つの方法があります：

### 方法 1 — セッションごとにコマンドで

セッションの最初にCopilot CLIに伝えてください：

> 「`modes/ja/` の日本語モードを使ってください。」

または

> 「評価と応募を日本語で — `modes/ja/_shared.md` と `modes/ja/kyujin.md` を使ってください。」

Copilot CLIは `modes/` の代わりにこのフォルダのファイルを読み込みます。

### 方法 2 — 恒久的にプロファイルで

`config/profile.yml` に言語設定を追加：

```yaml
language:
  primary: ja
  modes_dir: modes/ja
```

最初のセッションでCopilot CLIにこの設定を確認するよう伝えてください（「`profile.yml` を見て、`language.modes_dir` を設定したよ」）。以降、Copilot CLIは自動的に日本語モードを使用します。

> 注意：`language.modes_dir` フィールドは慣例であり、ハードコードされたスキーマではありません。メンテナーが構造を変更する場合、フィールド名は随時変更できます。

## 翻訳済みのモード

この最初のイテレーションでは、最もインパクトの大きい4つのモードをカバーしています：

| ファイル      | 翻訳元                    | 目的                                                               |
| ------------- | ------------------------- | ------------------------------------------------------------------ |
| `_shared.md`  | `modes/_shared.md`（EN）  | 共有コンテキスト、アーキタイプ、グローバルルール、日本市場の特殊性 |
| `kyujin.md`   | `modes/evaluate.md`（EN） | 求人の完全評価（ブロック A-F）                                     |
| `oubo.md`     | `modes/apply.md`（EN）    | 応募フォーム入力のライブアシスタント                               |
| `pipeline.md` | `modes/pipeline.md`（EN） | URL受信箱 / セカンドブレイン                                       |

その他のモード（`scan`、`batch`、`pdf`、`tracker`、`auto-pipeline`、`deep`、`contact`、`compare`、`project`、`training`）はこの段階では対象外です。EN版をそのまま使用します。これらの内容はツーリング、パス、設定コマンドが大部分を占めるため、言語に依存しません。

コミュニティが日本語モードを活用する場合、追加のモードは後続PRで翻訳予定です。

## 英語のまま残す項目

テック業界の標準語彙のため、意図的に翻訳していません：

- `cv.md`、`pipeline`、`tracker`、`report`、`score`、`archetype`、`proof point`
- ツール名（`Playwright`、`WebSearch`、`WebFetch`、`Read`、`Write`、`Edit`、`Bash`）
- トラッカーのステータス値（`Evaluated`、`Applied`、`Interview`、`Offer`、`Rejected`）
- コードスニペット、ファイルパス、コマンド

モードでは**自然なテック日本語**を使用します。東京、大阪、福岡のエンジニアリングチームで実際に使われているような表現：日本語の本文に、定着している英語の技術用語をそのまま混在させます。「Pipeline」を「導管」に、「Deploy」を「展開配置」に無理に訳すようなことはしません。

## 用語リファレンス

モードを修正・拡張する場合、トーンの一貫性を保つためにこの用語集に従ってください：

| 英語                   | 日本語（このコードベースで使用） |
| ---------------------- | -------------------------------- |
| Job posting            | 求人票 / 求人                    |
| Application            | 応募 / 候補                      |
| Cover letter           | 送付状 / カバーレター            |
| Resume / CV            | 履歴書 / 職務経歴書              |
| Salary                 | 給与 / 年収                      |
| Compensation           | 報酬 / パッケージ                |
| Skills                 | スキル / 技術力                  |
| Interview              | 面接 / 面談                      |
| Hiring manager         | 採用担当マネージャー             |
| Recruiter              | リクルーター / 採用担当          |
| AI                     | AI（そのまま使用）               |
| Requirements           | 要件 / 必須条件                  |
| Career history         | 職歴 / 経歴                      |
| Notice period          | 退職予告期間 / 引継ぎ期間        |
| Probation              | 試用期間                         |
| Vacation               | 有給休暇 / 年次有給休暇          |
| Bonus                  | ボーナス / 賞与                  |
| Permanent employment   | 正社員                           |
| Contract employee      | 契約社員                         |
| Freelance / Contractor | 業務委託 / フリーランス          |
| Temp staff (dispatch)  | 派遣社員                         |
| Overtime (fixed)       | みなし残業 / 固定残業代          |
| Retirement benefit     | 退職金制度                       |
| Social insurance       | 社会保険                         |
| Stock options          | ストックオプション（SO）         |
| Annual income          | 年収                             |
| Base salary            | 基本給                           |
| Discretionary labor    | 裁量労働制                       |
| Flex time              | フレックスタイム                 |
| Transfer/relocation    | 転勤                             |
| Health insurance       | 健康保険                         |
| Pension                | 厚生年金                         |
| Employment insurance   | 雇用保険                         |
| Commuting allowance    | 通勤手当                         |
| Housing allowance      | 住宅手当                         |

## コントリビューション

翻訳の改善や追加モードの翻訳をしたい場合：

1. `CONTRIBUTING.md` に従ってIssueを作成して提案する
2. 上記の用語集に従ってトーンの一貫性を保つ
3. 自然で慣用的に翻訳する — 直訳・逐語訳はしない
4. 構造的要素（ブロック A-F、テーブル、コードブロック、ツールの指示）は英語版と正確に同じ構造を維持する
5. PRを作成する前に、実際の日本語求人（例：Wantedly、Green、ビズリーチ）でテストする
