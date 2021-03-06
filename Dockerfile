FROM node:16

WORKDIR /app

ADD ./package.json .

RUN yarn install

ADD . .

ENV S3_ACCESS_KEY=$S3_ACCESS_KEY
ENV S3_SECRET_KEY=$S3_SECRET_KEY
ENV S3_ENDPOINT=$S3_ENDPOINT
ENV S3_REGION=$S3_REGION
ENV S3_BUCKET=$S3_BUCKET

ENV GOOGLE_CREDENTIALS=$GOOGLE_CREDENTIALS
ENV GOOGLE_TOKEN=$GOOGLE_TOKEN

ENV MONGO_URL=$MONGO_URL

ENV SLACK_WEBHOOK_URL=$SLACK_WEBHOOK_URL
ENV SLACK_CHANNEL=$SLACK_CHANNEL

ENV PORT=$PORT

ENTRYPOINT ["/app/src/entrypoint.sh"]