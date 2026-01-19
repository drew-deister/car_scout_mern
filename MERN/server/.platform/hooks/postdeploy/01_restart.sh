#!/bin/bash
# This script runs after deployment
# Restart the application to ensure it's running
pm2 restart all || true

