#!/usr/bin/env bash
# AmberMind sentinel loop — invoked by cron, keeps on-chain cadence organic:
#   * random jitter 0-45 min before doing anything
#   * 40% of runs stand down outright (intervals between actions vary widely)
#   * hard cap of MAX_ACTIONS_PER_DAY on-chain actions per UTC day
#   * the agent's own 4-check policy (feed freshness, price band, gas, inventory)
#     still gates every action inside autonomous.mjs
# Crontab: 17 */3 * * * /home/kajko/BASE2/amberforge/agents/ambermind/cron-run.sh
set -euo pipefail

export PATH="$HOME/.foundry/bin:/usr/local/bin:/usr/bin:/bin:$(dirname "$(command -v node 2>/dev/null || echo /usr/bin/node)")"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$DIR/logs"
LOG="$LOG_DIR/cron.log"
mkdir -p "$LOG_DIR"

MAX_ACTIONS_PER_DAY=2
SKIP_PCT=40
MAX_JITTER_S=${MAX_JITTER_S:-2700}

log() { echo "$(date -u +%FT%TZ) $*" >> "$LOG"; }

# jitter so runs never land on the cron minute
JITTER=$((RANDOM % (MAX_JITTER_S + 1)))
log "run start (jitter ${JITTER}s)"
sleep "$JITTER"

# random stand-down: varied cadence by construction
if (( RANDOM % 100 < SKIP_PCT )); then
  log "stand down: random skip"
  exit 0
fi

# daily action budget (count today's action lines in the log)
TODAY=$(date -u +%F)
ACTIONS_TODAY=$(grep -c "^${TODAY}.*action tx:" "$LOG" || true)
if (( ACTIONS_TODAY >= MAX_ACTIONS_PER_DAY )); then
  log "stand down: daily action budget spent (${ACTIONS_TODAY}/${MAX_ACTIONS_PER_DAY})"
  exit 0
fi

PRIVATE_KEY=$(cast wallet decrypt-keystore amberforge-deployer \
  --unsafe-password "$(cat "$HOME/.foundry/keystores/amberforge-deployer.password")" \
  | grep -oE '0x[0-9a-fA-F]{64}')
export PRIVATE_KEY

OUT=$(cd "$DIR" && node autonomous.mjs 2>&1) || { log "agent error: $OUT"; exit 1; }
# fold the agent's JSON trace + tx lines into the log, timestamped
while IFS= read -r line; do log "$line"; done <<< "$OUT"
log "run end"
