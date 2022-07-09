#!/bin/bash
mkdir -p /app/data/
echo $GOOGLE_CREDENTIALS > /app/data/google-credentials.json
echo $GOOGLE_TOKEN > /app/data/google-token.json

# Pass-down the arguments to the app
yarn start $@