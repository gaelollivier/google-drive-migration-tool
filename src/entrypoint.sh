#!/bin/bash
mkdir -p /app/data/
echo $GOOGLE_CREDENTIALS > /app/data/google-credentials.json
echo $GOOGLE_TOKEN > /app/data/google-token.json

# If --auth is passed, we'll use the Google Authentication flow
if [ "$1" = "--auth" ]; then
  echo "Using Google Authentication"
  yarn auth-flow
else
  yarn start
fi