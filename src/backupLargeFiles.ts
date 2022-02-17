import { drive_v3 } from 'googleapis';

import {
  getDriveClient,
  getFilePath,
  getFileStream,
  getLargestFiles,
} from './googleDownload';
import { objectExists, uploadObject } from './scalewayUpload';

async function uploadDriveFileToScaleway({
  drive,
  file,
}: {
  drive: drive_v3.Drive;
  file: drive_v3.Schema$File;
}) {
  // Get the file path
  const filePath = await getFilePath({ drive, file });
  const newFilename = `Drive Backup/${filePath}`;

  console.log('Checking', newFilename);

  // Check if the file is already uploaded
  const exists = await objectExists(newFilename);
  if (exists) {
    console.log('File already uploaded, skipped');
    return;
  }
  const fileStream = await getFileStream({ drive, file });

  const { uploadStream, promise } = uploadObject({
    filename: newFilename,
    totalSize: Number(file.quotaBytesUsed),
  });
  fileStream.pipe(uploadStream);

  const res = await promise;
  console.log({ res });
}

if (module === require.main) {
  (async () => {
    console.log('Test script: backing up a large file...');

    const drive = await getDriveClient();

    // Get largest files
    console.log('Listing largest files');
    const files = await getLargestFiles({ drive });

    for (const [index, file] of files.entries()) {
      console.log(`Transfering file ${index + 1}/${files.length}`);
      await uploadDriveFileToScaleway({ drive, file });
    }
  })();
}
