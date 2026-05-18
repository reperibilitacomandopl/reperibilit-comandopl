#!/bin/bash
cd /home/ubuntu/app
export $(grep -v '^#' .env | xargs)
sudo -E node scripts/send_test_push_to_mario.js
