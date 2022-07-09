import { drive_v3 } from 'googleapis';
import { Readable } from 'stream';

import { getAuth2Client } from './googleAuth';

function validateName(name: string) {
  if (name.includes('/')) {
    throw new Error(`Invalid name: ${name}`);
  }
  return name;
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
    pageSize: 1000,
    fields:
      'nextPageToken, files(id, name, quotaBytesUsed, parents, createdTime)',
    orderBy: 'quotaBytesUsed desc',
    // Exclude files modified after 2016, so we only move old files
    q: "modifiedTime < '2018-01-01T12:00:00'",
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
    return validateName(name ?? '');
  }

  const parentFolder = await drive.files.get({
    fileId: parent,
    fields: 'id, name, parents',
  });
  return `${await getFilePath({
    drive,
    file: parentFolder.data,
  })}/${validateName(name ?? '')}`;
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

export async function permanentlyDeleteFile({
  drive,
  fileId,
}: {
  drive: drive_v3.Drive;
  fileId: string;
}) {
  await drive.files.delete({
    fileId,
    supportsAllDrives: false,
  });
}

// if (require.main === module) {
//   (async () => {
//     // List largest files size
//     const drive = await getDriveClient();
//     const files = await getLargestFiles({ drive });
//     console.log(
//       Number(files.slice(-1)[0]?.quotaBytesUsed) / 1024 / 1024 / 1024
//     );
//     const totalSize = files.reduce(
//       (acc, file) => acc + (Number(file?.quotaBytesUsed) || 0),
//       0
//     );
//     console.log(`Total size (GB): ${totalSize / 1024 / 1024 / 1024}`);
//     const totalSize2 = files
//       .filter((file) => Number(file.createdTime?.slice(0, 4)) < 2020)
//       .reduce((acc, file) => acc + (Number(file.quotaBytesUsed) || 0), 0);
//     console.log(`Total size (GB): ${totalSize2 / 1024 / 1024 / 1024}`);
//   })();
// }
