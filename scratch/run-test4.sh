#!/bin/bash
export PORT=3005
npm run dev > scratch/dev_error.log 2>&1 &
PID=$!
echo "Waiting for dev server..."
sleep 15
echo "Fetching residence-signature-trois-chambres-six-personnes on port 3005"
curl -s http://localhost:3005/hebergements/residence-signature-trois-chambres-six-personnes > /dev/null
sleep 2
kill $PID
echo "Server killed. Errors:"
grep -A 30 -i "Error\|TypeError" scratch/dev_error.log
