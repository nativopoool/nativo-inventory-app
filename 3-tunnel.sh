#!/bin/bash
ssh -i nativobot.pem -p 2222 -N -L 8080:localhost:18791 openclaw@52.200.214.27 &
PID=$!
echo "Tunnel active (PID: $PID) at http://localhost:8080/chat"
echo "Press Enter to close."
read
kill $PID
