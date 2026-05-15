#!/bin/bash
sudo docker exec app-db-1 psql -U postgres -d postgres -t -c "
SELECT type, timestamp, \"deletedAt\"
FROM \"ClockRecord\"
WHERE \"userId\" = '87eb6244-b181-4a42-a8d1-7f12253fdfb3'
ORDER BY timestamp DESC LIMIT 5;
"

echo "---PUSH SUBS---"
sudo docker exec app-db-1 psql -U postgres -d postgres -t -c "
SELECT id, endpoint, \"createdAt\"
FROM \"PushSubscription\"
WHERE \"userId\" = '87eb6244-b181-4a42-a8d1-7f12253fdfb3';
"
