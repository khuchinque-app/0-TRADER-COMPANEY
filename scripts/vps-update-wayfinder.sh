#!/bin/bash
# VPS Update Script for 0-TRADER-COMPANEY
# Installs Wayfinder skills and configures Hermes Agent

set -e

PROJECT_DIR="/home/khuchinque/0-TRADER-COMPANEY"
HERMES_SKILLS_DIR="$HOME/.hermes/profiles/herme-khuchinque/skills/engineering"

echo "=== VPS Update Script ==="
echo ""

# Step 1: Git Pull
echo "Step 1: Pulling latest code..."
cd "$PROJECT_DIR"
git pull origin master 2>/dev/null || echo "No changes to pull or not on master branch"
echo "✅ Git pull complete"

# Step 2: Install Wayfinder Skills
echo ""
echo "Step 2: Installing Wayfinder skills..."

# Copy wayfinder skill from PLANNING to hermes skills
if [ -d "$PROJECT_DIR/PLANNING/.agents/skills/wayfinder" ]; then
    cp -r "$PROJECT_DIR/PLANNING/.agents/skills/wayfinder" "$HERMES_SKILLS_DIR/"
    echo "✅ Wayfinder skill installed to $HERMES_SKILLS_DIR/wayfinder"
else
    echo "⚠️ Wayfinder source not found in PLANNING/.agents/skills/"
fi

# Copy other engineering skills
for skill_dir in ask-matt code-review codebase-design diagnosing-bugs domain-modeling grill-me grill-with-docs grilling implement implement-spec improve-codebase-architecture loop-me pr retro setup-matt-pocock-skills tdd teach to-questionnaire to-spec to-tickets triage wait-what writing-beats writing-for-agents writing-fragments writing-shape wizard; do
    if [ -d "$PROJECT_DIR/PLANNING/.agents/skills/$skill_dir" ]; then
        cp -r "$PROJECT_DIR/PLANNING/.agents/skills/$skill_dir" "$HERMES_SKILLS_DIR/" 2>/dev/null || true
    fi
done

echo "✅ Engineering skills installed"

# Step 4: Verify Services
echo ""
echo "Step 4: Verifying services..."

pm2 list | grep -E "backend|terminal|engine" || echo "⚠️ PM2 services not running"

# Step 5: Run Wayfinder Analysis
echo ""
echo "Step 5: Running Wayfinder project analysis..."

# Check project structure
echo "📁 Project Structure:"
find "$PROJECT_DIR" -maxdepth 2 -type d | grep -v node_modules | grep -v .git | grep -v __pycache__ | sort | head -30

echo ""
echo "📄 Key Files:"
ls -la "$PROJECT_DIR"/*.md "$PROJECT_DIR"/*.json "$PROJECT_DIR"/*.sh 2>/dev/null | awk '{print $9, $5}'

echo ""
echo "🔧 PM2 Services:"
pm2 list | grep -E "backend|terminal|engine" || echo "Services not running"

echo ""
echo "🌐 Ports:"
ss -tlnp | grep -E "(11110|22220|2217)" || echo "Ports not listening"

echo ""
echo "=== Update Complete ==="
echo "Project: $PROJECT_DIR"
echo "Branch: $(git branch --show-current)"
echo "Commit: $(git rev-parse --short HEAD)"
