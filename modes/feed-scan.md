# feed-scan.md — RSS/Atom Job Discovery

Use this mode when the user asks to scan feeds, RSS, Atom, or passive job discovery sources.

## Inputs

- `feeds.yml` if present, otherwise `templates/feeds.example.yml`
- `config/profile.yml` and `modes/_profile.md` for target keywords
- `data/pipeline.md` and `data/applications.md` for deduplication

## Workflow

1. Run `node feed-scan.mjs --json`.
2. Review matches against the user's target role and geography rules.
3. Discard stale, irrelevant, junior, or stack-mismatched roles.
4. If the user wants to queue the matches, run `node feed-scan.mjs --write`.
5. Tell the user exactly how many URLs were added to `data/pipeline.md`.

## Configuration

Copy `templates/feeds.example.yml` to `feeds.yml` and add feed sources:

```yaml
feeds:
  - name: "Example Jobs"
    url: "https://example.com/jobs.rss"
    positive: ["backend", "golang"]
    negative: ["intern", "frontend"]
```

The scanner accepts RSS and Atom feeds.
