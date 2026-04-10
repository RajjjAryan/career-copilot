# モード：パイプライン — URL受信箱（セカンドブレイン）

> **トリガー**：候補者がパイプラインの未処理URLの処理を依頼した場合。
> **入力**：`data/pipeline.md` の未処理アイテム。
> **出力**：各未処理URLをauto-pipelineで評価し、結果をトラッカーに登録。

---

## 前提条件

```
view(path="modes/_shared.md")
view(path="modes/_profile.md")
view(path="cv.md")
view(path="data/pipeline.md")
```

---

`data/pipeline.md` に蓄積された求人URLを処理する。候補者は気になる求人URLを見つけたらすぐに受信箱に追加し、後で `/career-copilot pipeline` を実行して一括処理する。

## ワークフロー

1. **読み取り** `data/pipeline.md` → 「未処理」/「Pending」セクションの `- [ ]` アイテムをすべて検出
2. **各未処理URLについて**：
   a. 次の `REPORT_NUM` を計算（`reports/` を読み、最大番号 + 1）
   b. **求人票を抽出**：Playwright（`browser_navigate` + `browser_snapshot`）→ WebFetch → WebSearch
   c. URLにアクセスできない場合 → `- [!]` とメモを付けて次へ進む
   d. **完全なAuto-Pipelineを実行**：`modes/auto-pipeline.md` の正規フローに従い、評価 → レポート `.md` → PDF → トラッカー
   e. **「未処理」から「処理済み」へ移動**：`- [x] #NNN | URL | 企業 | ロール | スコア/5 | PDF ✅/❌`
3. **未処理URLが3件以上** の場合、`task` ツールで独立した求人を並列処理する（`modes/pipeline.md` の正規パターンに従う）。
4. **最後に** サマリーテーブルを出力：

```
| # | 企業 | ロール | スコア | PDF | 推奨アクション |
```

## pipeline.md の形式

```markdown
## 未処理
- [ ] https://jobs.example.com/posting/123
- [ ] https://boards.greenhouse.io/company/jobs/456 | Company株式会社 | シニアPM
- [!] https://private.url/job — エラー：ログイン必要

## 処理済み
- [x] #143 | https://jobs.example.com/posting/789 | Acme株式会社 | AI PM | 4.2/5 | PDF ✅
- [x] #144 | https://boards.greenhouse.io/xyz/jobs/012 | BigCo | SA | 2.1/5 | PDF ❌
```

> 注意：セクション見出しは EN（「Pending」/「Processed」）、JA（「未処理」/「処理済み」）のいずれでも可。読み取り時は柔軟に対応し、書き込み時は既存ファイルのスタイルに合わせる。

## URL からの求人票の自動検出

1. **Playwright（推奨）：** `browser_navigate` + `browser_snapshot`。すべてのSPAに対応。
2. **WebFetch（フォールバック）：** 静的ページ、またはPlaywrightが利用できない場合。
3. **WebSearch（最終手段）：** 求人票をインデックスしている二次ポータルで検索。

**特殊ケース：**
- **LinkedIn**：ログインが必要な場合あり → `[!]` でマークし、候補者にテキストの貼り付けを依頼
- **PDF**：URLがPDFを指している場合、Readツールで直接読み取り
- **`local:` プレフィックス**：ローカルファイルを読み取る。例：`local:jds/linkedin-pm-ai.md` → `jds/linkedin-pm-ai.md` を読む
- **Green、Lever、Ashby**：SPAが多い。Playwrightが最適
- **Wantedly / Green / ビズリーチ / リクナビNEXT**：日本市場で一般的なポータル。Cookie同意バナーがあることも。Playwrightのスナップショットでスクロールして求人テキストを取得

## 自動採番

1. `reports/` のすべてのファイルをリスト
2. プレフィックスから番号を抽出（例：`142-medispend...` → 142）
3. 新しい番号 = 見つかった最大値 + 1

## ソースの同期確認

URLの処理を開始する前に、同期をチェック：

```bash
node cv-sync-check.mjs
```

差異があれば、作業前に候補者に警告する。
