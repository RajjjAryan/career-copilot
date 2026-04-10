#!/usr/bin/env bash
set -euo pipefail

# career-copilot setup script
# One command: curl -sL <repo-url>/setup.sh | bash
# Or locally:  bash setup.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✅ $1${NC}"; }
fail() { echo -e "  ${RED}❌ $1${NC}"; exit 1; }
warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "  $1"; }

echo ""
echo "🚀 career-copilot setup"
echo "========================"
echo ""

# 1. Check Node.js
echo "1. Checking Node.js..."
if command -v node &>/dev/null; then
  NODE_VERSION=$(node -v | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 18 ]; then
    pass "Node.js v${NODE_VERSION}"
  else
    fail "Node.js >= 18 required (found v${NODE_VERSION}). Install from https://nodejs.org"
  fi
else
  fail "Node.js not found. Install from https://nodejs.org (v18+)"
fi

# 2. Install npm dependencies
echo ""
echo "2. Installing npm dependencies..."
if [ -f package.json ]; then
  npm install --no-fund --no-audit 2>&1 | tail -1
  pass "npm packages installed"
else
  fail "package.json not found — run this from the career-copilot directory"
fi

# 3. Install Playwright Chromium
echo ""
echo "3. Installing Playwright Chromium (for PDF generation)..."
npx playwright install chromium 2>&1 | tail -3
pass "Playwright Chromium installed"

# 4. Check Go (optional — for TUI dashboard)
echo ""
echo "4. Checking Go (optional — for TUI dashboard)..."
if command -v go &>/dev/null; then
  GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
  pass "Go ${GO_VERSION} — dashboard available"
  info "  Build with: cd dashboard && go build -o career-dashboard ."
else
  warn "Go not installed — TUI dashboard won't build (everything else works fine)"
  info "  Install from https://go.dev/dl/ if you want the dashboard"
fi

# 5. Setup config files
echo ""
echo "5. Setting up configuration..."
if [ ! -f config/profile.yml ]; then
  if [ -f config/profile.example.yml ]; then
    cp config/profile.example.yml config/profile.yml
    warn "Created config/profile.yml from template — edit with your details"
  else
    warn "No profile template found — create config/profile.yml manually"
  fi
else
  pass "config/profile.yml exists"
fi

if [ ! -f portals.yml ]; then
  if [ -f templates/portals.example.yml ]; then
    cp templates/portals.example.yml portals.yml
    warn "Created portals.yml from template — customize for your job search"
  else
    warn "No portals template found"
  fi
else
  pass "portals.yml exists"
fi

if [ ! -f cv.md ]; then
  warn "cv.md not found — create it with your CV in markdown format"
  info "  See examples/ for reference CV formats"
else
  pass "cv.md exists"
fi

# 6. Run doctor
echo ""
echo "6. Running doctor check..."
echo ""
node doctor.mjs 2>&1 || true

echo ""
echo "========================"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit config/profile.yml with your details"
echo "  2. Create cv.md with your CV in markdown"
echo "  3. Open GitHub Copilot CLI in this directory"
echo "  4. Paste a job URL to evaluate it"
echo ""
