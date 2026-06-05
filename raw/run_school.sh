#!/bin/bash
# args: slug url
SLUG="$1"
URL="$2"
S=sg7
DIR=/Users/ciprian/work_mumzworld/uniforms/raw
OUT="$DIR/out/$SLUG.json"
ACC="$DIR/out/.acc.$SLUG.jsonl"
> "$ACC"

# strip any existing query for clean pagination base
BASE="${URL%%\?*}"

load_page() {
  local purl="$1"
  browse --session $S goto "$purl" >/dev/null 2>&1
  browse --session $S wait --network-idle >/dev/null 2>&1
  browse --session $S js "window.scrollTo(0,2500)" >/dev/null 2>&1
  browse --session $S eval "$DIR/scroll.js" >/dev/null 2>&1
  browse --session $S wait --network-idle >/dev/null 2>&1
  browse --session $S js "window.scrollTo(0,0)" >/dev/null 2>&1
}

get_total() {
  browse --session $S js "(()=>{const el=document.querySelector('.toolbar-amount');if(!el)return '0';const m=el.innerText.match(/of\\s+([0-9]+)/);if(m)return m[1];const m2=el.innerText.match(/([0-9]+)\\s+Item/i);return m2?m2[1]:String(document.querySelectorAll('.product-item').length);})()" 2>/dev/null | tail -1
}

extract_page() {
  browse --session $S eval "$DIR/extract.js" 2>/dev/null | tail -1
}

# Page 1
load_page "$BASE"
TOTAL=$(get_total)
TOTAL=$(echo "$TOTAL" | tr -dc '0-9')
[ -z "$TOTAL" ] && TOTAL=0
extract_page >> "$ACC"

# pages 2..N (page size 24)
if [ "$TOTAL" -gt 24 ] 2>/dev/null; then
  PAGES=$(( (TOTAL + 23) / 24 ))
  p=2
  while [ "$p" -le "$PAGES" ]; do
    load_page "${BASE}?p=${p}"
    extract_page >> "$ACC"
    p=$((p+1))
  done
fi

# merge all jsonl arrays, then clean+dedupe
node -e "
const fs=require('fs');
const lines=fs.readFileSync('$ACC','utf8').split('\n').filter(Boolean);
let all=[];
for(const l of lines){try{all=all.concat(JSON.parse(l))}catch(e){}}
process.stdout.write(JSON.stringify(all));
" | node "$DIR/clean.js" > "$OUT"
rm -f "$ACC"
FINAL=$(node -e "const a=require('$OUT');console.log(a.length)")
echo "DONE $SLUG total=$TOTAL count=$FINAL"
