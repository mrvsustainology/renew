# first delte all
pm2 delete all

# start the server it is on 4000 mentioned in the env
cd /home/ubuntu/renew/apps/server
pm2 start node --name "renew-server" -- dist/apps/server/src/index.js


# start oeprator on 3000
cd /home/ubuntu/renew/apps/operator
pm2 start npm --name "OPERATOR" -e PORT=3000 -- start


# start admin on 3001
cd /home/ubuntu/renew/apps/admin
pm2 start npm --name "ADMIN" -e PORT=3001 -- start
