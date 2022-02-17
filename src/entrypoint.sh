#!/bin/bash
echo $GOOGLE_CREDENTIALS > /app/data/google-credentials.json
echo $GOOGLE_TOKEN > /app/data/google-token.json

yarn ts-node -T /app/src/backupLargeFiles.ts