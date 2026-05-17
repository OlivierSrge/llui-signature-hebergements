#!/bin/bash
export PORT=3005
npm run dev > scratch/dev_error.log 2>&1 &
PID=$!
sleep 15
node scratch/test-2.js | tee scratch/test-2.out
SLUG=$(grep "Found ACTIVE slug:" scratch/test-2.out | awk '{print $4}')
echo "Fetching $SLUG on port 3005"
curl -s http://localhost:3005/hebergements/$SLUG > /dev/null
sleep 2
kill $PID
echo "Server killed. Errors:"
grep -A 30 -i "Error:" scratch/dev_error.log
