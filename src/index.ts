import { WebClient } from '@slack/client';

import { uploadDriveFileToScaleway } from './backupLargeFiles';
import { runDbQuery } from './db';
import { getDriveClient, getFilePath, getLargestFiles } from './googleDownload';

(async () => {
  console.log('Test script: backing up a large file...');

  const drive = await getDriveClient();

  // Get largest files
  console.log('Listing largest files');
  const files = await getLargestFiles({ drive });

  // NOTE: Not used at the moment but can be used for testing
  const filteredFiles = files;

  console.log(
    'TOTAL FILES SIZE:',
    Math.round(
      filteredFiles.reduce(
        (sum, file) => sum + Number(file.quotaBytesUsed),
        0
      ) /
        1024 /
        1024 /
        1024
    ),
    'GB'
  );

  for (const [index, file] of filteredFiles.entries()) {
    const sizeInGb = Math.round(
      Number(file.quotaBytesUsed) / 1024 / 1024 / 1024
    );
    console.log(
      `Migrating file ${index + 1}/${
        filteredFiles.length
      }, size: ${sizeInGb} GB`
    );
    console.log(file);

    const existingFile = await runDbQuery(async (db) => {
      return await db.collection('files').findOne({ 'file.id': file.id });
    });

    if (existingFile && existingFile['status'] === 'uploaded') {
      console.log('File already uploaded');
      continue;
    }

    const filePath = await getFilePath({ drive, file });

    await runDbQuery(async (db) => {
      await db
        .collection('files')
        .findOneAndUpdate(
          { 'file.id': file.id },
          { $set: { file, filePath, status: 'uploading' } },
          { upsert: true }
        );
    });

    await uploadDriveFileToScaleway({
      drive,
      file,
      logPrefix: `${index + 1}/${filteredFiles.length}`,
    });

    await runDbQuery(async (db) => {
      await db
        .collection('files')
        .findOneAndUpdate(
          { 'file.id': file.id },
          { $set: { status: 'uploaded' } }
        );
    });

    // Notify Slack webhook
    const slackWebhook = process.env['SLACK_WEBHOOK_URL'];
    const slackChannel = process.env['SLACK_CHANNEL'];
    if (slackWebhook && slackChannel) {
      console.log('Notifying Slack');
      const web = new WebClient(slackWebhook);
      await web.chat.postMessage({
        channel: slackChannel,
        text: `File ${index + 1}/${
          filteredFiles.length
        } uploaded: ${sizeInGb} GB, ${filePath}`,
      });
    }
  }
})();
