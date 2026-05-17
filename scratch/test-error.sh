#!/bin/bash
export PORT=3005
npm run dev > scratch/dev_error.log 2>&1 &
PID=$!
echo "Dev server started with PID $PID"
sleep 10
# Fetch one of the new accommodations
curl -s http://localhost:3005/hebergements/residence-signature-trois-chambres-six-personnes > /dev/null
sleep 2
curl -s http://localhost:3005/hebergements/suite-feline > /dev/null
sleep 2
kill $PID
echo "Dev server killed."
grep -A 20 -i "TypeError\|Error:" scratch/dev_error.log
