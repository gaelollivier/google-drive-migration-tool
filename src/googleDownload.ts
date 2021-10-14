import { Auth, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

import { getAuth2Client } from './googleAuth';

function escapeName(name: string) {
  return name.replace(/\//g, '\\/');
}

export async function getDriveClient() {
  const auth = await getAuth2Client();
  const drive = new drive_v3.Drive({ auth });
  return drive;
}

export async function getLargestFiles({
  drive,
}: {
  drive: drive_v3.Drive;
}): Promise<Array<drive_v3.Schema$File>> {
  const res = await drive.files.list({
    pageSize: 10,
    fields: 'nextPageToken, files(id, name, quotaBytesUsed, parents)',
    orderBy: 'quotaBytesUsed desc',
  });

  const files = res.data.files ?? [];
  if (!files.length) {
    throw new Error('No files found');
  }

  return files;
}

export async function getFilePath({
  drive,
  file: { name, parents },
}: {
  drive: drive_v3.Drive;
  file: drive_v3.Schema$File;
}): Promise<string> {
  const parent = parents?.[0];
  if (!parent) {
    return escapeName(name ?? '');
  }

  const parentFolder = await drive.files.get({
    fileId: parent,
    fields: 'id, name, parents',
  });
  return `${await getFilePath({ drive, file: parentFolder.data })}/${escapeName(
    name ?? ''
  )}`;
}

export async function getFileStream({
  drive,
  file,
}: {
  drive: drive_v3.Drive;
  file: drive_v3.Schema$File;
}): Promise<Readable> {
  const fileStream = await drive.files.get(
    { fileId: file.id ?? '', alt: 'media' },
    { responseType: 'stream' }
  );

  let downloaded = 0;
  const fileSize = Number(file.quotaBytesUsed) || 0;

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
      console.log('Download done');
    })
    .on('error', function (err) {
      console.log('Error during download', err);
    });

  return fileStream.data;
}
