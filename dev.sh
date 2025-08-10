#!/bin/bash
cd /root/repo
rm -rf apps/web/.next
cd apps/web
npx next dev --port 3001