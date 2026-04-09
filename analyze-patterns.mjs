#!/usr/bin/env node

// analyze-patterns.mjs — Structured pattern analysis of application history
//
// Reads data/applications.md and reports/*.md, outputs a JSON object to stdout
// with aggregated metrics, gap/match frequency analysis, and recommendations.
//
// Usage: node analyze-patterns.mjs
// Dependencies: Node.js built-in modules only (fs, path)

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, basename } from "path";

const ROOT = new URL(".", import.meta.url).pathname;
const APPLICATIONS_PATH = join(ROOT, "data", "applications.md");
const REPORTS_DIR = join(ROOT, "reports");

// ─── Tracker Parsing ────────────────────────────────────────────────────────

function parseApplicationsTable(content) {
  const lines = content.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = headerLine
    .split("|")
    .map((h) => h.trim())
    .filter(Boolean);

  // Skip header and separator rows
  const dataLines = lines.slice(2);

  return dataLines
    .map((line) => {
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length < 2) return null;

      const row = {};
      headers.forEach((h, i) => {
        row[h] = cells[i] || "";
      });
      return row;
    })
    .filter(Boolean);
}

function extractScore(scoreStr) {
  if (!scoreStr) return null;
  const match = scoreStr.match(/(\d+(?:\.\d+)?)\s*\/\s*5/);
  return match ? parseFloat(match[1]) : null;
}

function normalizeStatus(status) {
  if (!status) return "Unknown";
  const s = status.trim().toLowerCase();
  const mapping = {
    evaluated: "Evaluated",
    "pdf generated": "PDF Generated",
    applied: "Applied",
    interview: "Interview",
    offer: "Offer",
    rejected: "Rejected",
    declined: "Declined",
    ghosted: "Ghosted",
  };
  return mapping[s] || status.trim();
}

// ─── Report Parsing ─────────────────────────────────────────────────────────

const GAP_KEYWORDS = [
  "gap",
  "missing",
  "no evidence",
  "not listed",
  "not mentioned",
  "zero experience",
  "absence",
  "lacking",
  "weak",
  "limited experience",
  "no exposure",
];

const MATCH_KEYWORDS = [
  "strong match",
  "direct match",
  "solid match",
  "excellent",
  "strong",
  "proven",
  "extensive",
  "deep experience",
  "demonstrated",
];

function readReportFiles() {
  if (!existsSync(REPORTS_DIR)) return [];

  return readdirSync(REPORTS_DIR)
    .filter((f) => f.endsWith(".md") && f !== ".gitkeep")
    .map((f) => {
      try {
        return {
          filename: f,
          content: readFileSync(join(REPORTS_DIR, f), "utf-8"),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function extractSection(content, sectionPattern) {
  const regex = new RegExp(
    `(?:^|\\n)#+\\s*${sectionPattern}[^\\n]*\\n([\\s\\S]*?)(?=\\n#+\\s|$)`,
    "i"
  );
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

function extractGapsFromReport(content) {
  const gaps = [];

  // Look for "Gaps" or "Top 3 Gaps" sections
  const gapSection =
    extractSection(content, "(?:Top \\d+ )?Gaps") ||
    extractSection(content, "Gaps & Mitigation");

  if (gapSection) {
    // Extract numbered items or table rows
    const bulletMatches = gapSection.match(
      /(?:^\d+\.\s*\*\*(.+?)\*\*|^\|\s*(.+?)\s*\|)/gm
    );
    if (bulletMatches) {
      for (const m of bulletMatches) {
        const bold = m.match(/\*\*(.+?)\*\*/);
        if (bold) gaps.push(bold[1].trim());
      }
    }
  }

  // Fallback: scan for gap keywords in full content
  if (gaps.length === 0) {
    const lines = content.split("\n");
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (GAP_KEYWORDS.some((kw) => lower.includes(kw))) {
        const bold = line.match(/\*\*(.+?)\*\*/);
        if (bold && bold[1].length < 80) {
          gaps.push(bold[1].trim());
        }
      }
    }
  }

  return gaps;
}

function extractMatchesFromReport(content) {
  const matches = [];

  // Look for "Matches" or "Top 3 CV Matches" sections
  const matchSection =
    extractSection(content, "(?:Top \\d+ )?(?:CV )?Match(?:es)?") || "";

  if (matchSection) {
    const bulletMatches = matchSection.match(
      /(?:^\d+\.\s*\*\*(.+?)\*\*|^\|\s*(.+?)\s*\|)/gm
    );
    if (bulletMatches) {
      for (const m of bulletMatches) {
        const bold = m.match(/\*\*(.+?)\*\*/);
        if (bold) matches.push(bold[1].trim());
      }
    }
  }

  // Fallback: scan for match keywords
  if (matches.length === 0) {
    const lines = content.split("\n");
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (MATCH_KEYWORDS.some((kw) => lower.includes(kw))) {
        const bold = line.match(/\*\*(.+?)\*\*/);
        if (bold && bold[1].length < 80) {
          matches.push(bold[1].trim());
        }
      }
    }
  }

  return matches;
}

// ─── Frequency Counting ─────────────────────────────────────────────────────

function countFrequencies(items) {
  const freq = {};
  for (const item of items) {
    const key = item.toLowerCase();
    freq[key] = (freq[key] || 0) + 1;
  }
  return Object.entries(freq)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── Score Bucketing ─────────────────────────────────────────────────────────

function bucketScores(scores) {
  const buckets = {
    "4.5+": 0,
    "4.0-4.4": 0,
    "3.5-3.9": 0,
    "<3.5": 0,
  };

  for (const s of scores) {
    if (s >= 4.5) buckets["4.5+"]++;
    else if (s >= 4.0) buckets["4.0-4.4"]++;
    else if (s >= 3.5) buckets["3.5-3.9"]++;
    else buckets["<3.5"]++;
  }

  return buckets;
}

// ─── Recommendations Engine ─────────────────────────────────────────────────

function generateRecommendations(result) {
  const recs = [];

  // Recommend addressing top gaps
  if (result.top_gaps.length > 0) {
    const topGap = result.top_gaps[0];
    recs.push(
      `Address your #1 recurring gap: "${topGap.name}" (mentioned ${topGap.count} time${topGap.count > 1 ? "s" : ""}). ` +
        `Consider building a portfolio project or upskilling to close this gap.`
    );
  }

  if (result.top_gaps.length > 1) {
    const criticalGaps = result.top_gaps.filter((g) => g.count >= 2);
    if (criticalGaps.length > 0) {
      recs.push(
        `${criticalGaps.length} gap${criticalGaps.length > 1 ? "s appear" : " appears"} in multiple evaluations: ` +
          `${criticalGaps.map((g) => `"${g.name}"`).join(", ")}. Prioritize these for upskilling.`
      );
    }
  }

  // Score-based recommendations
  if (result.avg_score !== null) {
    if (result.avg_score < 3.5) {
      recs.push(
        `Your average score is ${result.avg_score.toFixed(1)}/5 (Weak). Consider narrowing your target roles to archetypes where you score higher.`
      );
    } else if (result.avg_score < 4.0) {
      recs.push(
        `Your average score is ${result.avg_score.toFixed(1)}/5 (Decent). Focus on roles aligned with your strongest matches to push into the 4.0+ range.`
      );
    }
  }

  // Rejection/ghosted ratio
  const rejected = result.by_status["Rejected"] || 0;
  const ghosted = result.by_status["Ghosted"] || 0;
  const total = result.total_applications;
  if (total > 0) {
    const failRate = (rejected + ghosted) / total;
    if (failRate > 0.5) {
      recs.push(
        `${Math.round(failRate * 100)}% of applications ended in rejection or ghosting. Review your targeting criteria and consider focusing on roles where your score is 4.0+.`
      );
    }
  }

  // Pipeline health
  const applied = result.by_status["Applied"] || 0;
  const interview = result.by_status["Interview"] || 0;
  if (applied > 0 && interview === 0) {
    recs.push(
      `You have ${applied} applications submitted but no interviews yet. Consider revising your CV or cover letter approach.`
    );
  }

  // Leverage strengths
  if (result.top_matches.length > 0) {
    const topMatch = result.top_matches[0];
    recs.push(
      `Your strongest match area is "${topMatch.name}" (${topMatch.count} mention${topMatch.count > 1 ? "s" : ""}). ` +
        `Lean into this strength when targeting new roles.`
    );
  }

  // Ensure at least one recommendation
  if (recs.length === 0) {
    if (total === 0) {
      recs.push(
        "No applications tracked yet. Start by evaluating a few JDs to build your pipeline."
      );
    } else {
      recs.push(
        "Continue applying to roles matching your strongest archetypes. Track outcomes to refine your strategy."
      );
    }
  }

  return recs;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const result = {
    total_applications: 0,
    by_status: {},
    by_score_range: { "4.5+": 0, "4.0-4.4": 0, "3.5-3.9": 0, "<3.5": 0 },
    by_company: [],
    top_gaps: [],
    top_matches: [],
    avg_score: null,
    score_trend: [],
    recommendations: [],
  };

  // Parse applications tracker
  let rows = [];
  if (existsSync(APPLICATIONS_PATH)) {
    try {
      const content = readFileSync(APPLICATIONS_PATH, "utf-8");
      rows = parseApplicationsTable(content);
    } catch {
      // File exists but can't be read — treat as empty
    }
  }

  result.total_applications = rows.length;

  if (rows.length === 0) {
    result.recommendations = [
      "No applications tracked yet. Start by evaluating a few JDs to build your pipeline.",
    ];
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  // Aggregate by status
  const statusCounts = {};
  for (const row of rows) {
    const status = normalizeStatus(row["Status"]);
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }
  result.by_status = statusCounts;

  // Aggregate scores
  const scores = [];
  const scoreTrend = [];
  for (const row of rows) {
    const score = extractScore(row["Score"]);
    if (score !== null) {
      scores.push(score);
      const date = row["Date"] || "";
      scoreTrend.push({ date, score });
    }
  }

  result.by_score_range = bucketScores(scores);

  if (scores.length > 0) {
    result.avg_score =
      Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) /
      100;
  }

  // Sort trend chronologically
  result.score_trend = scoreTrend.sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Collect companies
  const companies = new Set();
  for (const row of rows) {
    const company = row["Company"] || "";
    if (company) companies.add(company.trim());
  }
  result.by_company = [...companies].sort();

  // Parse reports for gaps and matches
  const allGaps = [];
  const allMatches = [];

  const reports = readReportFiles();
  for (const report of reports) {
    // Skip pattern analysis reports to avoid self-referencing
    if (basename(report.filename).startsWith("pattern-analysis")) continue;

    const gaps = extractGapsFromReport(report.content);
    const matches = extractMatchesFromReport(report.content);

    allGaps.push(...gaps);
    allMatches.push(...matches);
  }

  result.top_gaps = countFrequencies(allGaps).slice(0, 15);
  result.top_matches = countFrequencies(allMatches).slice(0, 15);

  // Generate recommendations
  result.recommendations = generateRecommendations(result);

  console.log(JSON.stringify(result, null, 2));
}

main();
