FROM node:16

WORKDIR /app

ADD ./package.json .

RUN yarn install

ADD ./src /app/src

ENV S3_ACCESS_KEY=$S3_ACCESS_KEY
ENV S3_SECRET_KEY=$S3_SECRET_KEY
ENV S3_ENDPOINT=$S3_ENDPOINT
ENV S3_REGION=$S3_REGION
ENV S3_BUCKET=$S3_BUCKET

CMD ["yarn", "ts-node", "-T", "./src/backupLargeFiles.ts"]