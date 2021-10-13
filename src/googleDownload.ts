import { createWriteStream, writeFileSync } from 'fs';
import { Auth, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

import { getAuth2Client } from './googleAuth';

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function getFile(auth: Auth.OAuth2Client): Promise<Readable> {
  const drive = new drive_v3.Drive({ auth });
  const res = await drive.files.list({
    pageSize: 100,
    fields: 'nextPageToken, files(id, name, quotaBytesUsed, parents)',
    orderBy: 'quotaBytesUsed desc',
  });

  const files = res.data.files ?? [];
  if (!files.length) {
    throw new Error('No files found');
  }

  const last = files[files.length - 1];
  console.log(last);

  const fileStream = await drive.files.get(
    {
      fileId: last?.id ?? '',
      alt: 'media',
    },
    { responseType: 'stream' }
  );

  if (!fileStream) {
    throw new Error('fileStream is null');
  }

  let downloaded = 0;
  const fileSize = Number(last?.quotaBytesUsed) || 0;

  fileStream.data
    .on('data', (data) => {
      const prevPercent = (downloaded / fileSize) * 100;
      downloaded += data.length;
      const percent = (downloaded / fileSize) * 100;
      // Log every 10%
      if (Math.floor(prevPercent / 10) !== Math.floor(percent / 10)) {
        console.log(`Downloaded ${Math.floor(percent)}%`);
      }
    })
    .on('end', function () {
      console.log('Done');
    })
    .on('error', function (err) {
      console.log('Error during download', err);
    });

  return fileStream.data;
}

export async function getFileStream() {
  const auth = await getAuth2Client();
  return getFile(auth);
}

if (module === require.main) {
  (async () => {
    const auth = await getAuth2Client();
    getFile(auth);
  })();
}
