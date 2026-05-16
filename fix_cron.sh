#!/bin/bash
SECRET="a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
cat > /tmp/newcron << EOF
*/5 * * * * curl -s -H "Authorization: Bearer ${SECRET}" http://localhost:3000/api/cron/shift-reminder > /dev/null 2>&1
*/15 * * * * curl -s -H "Authorization: Bearer ${SECRET}" http://localhost:3000/api/cron/clock-reminder > /dev/null 2>&1
EOF
crontab /tmp/newcron
echo "Crontab aggiornato:"
crontab -l
echo ""
echo "Test manuale shift-reminder:"
curl -s -H "Authorization: Bearer ${SECRET}" http://localhost:3000/api/cron/shift-reminder
