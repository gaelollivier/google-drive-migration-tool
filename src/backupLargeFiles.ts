import { drive_v3 } from 'googleapis';

import { getFilePath, getFileStream } from './googleDownload';
import { objectExists, uploadObject } from './scalewayUpload';

export function getScalewayPath(driveFilePath: string) {
  const newFilename = `Drive Backup/${driveFilePath}`;
  return newFilename;
}

export async function isFileInScaleway(filePath: string) {
  return objectExists(filePath);
}

export async function uploadDriveFileToScaleway({
  drive,
  file,
  logPrefix,
}: {
  drive: drive_v3.Drive;
  file: drive_v3.Schema$File;
  logPrefix: string;
}) {
  // Get the file path
  const filePath = await getFilePath({ drive, file });
  const newFilename = getScalewayPath(filePath);

  console.log(logPrefix, 'Checking', newFilename);

  // Check if the file is already uploaded
  const exists = await isFileInScaleway(newFilename);
  if (exists) {
    console.log(logPrefix, 'File already uploaded, skipped');
    return;
  }
  const fileStream = await getFileStream({ drive, file });

  const { uploadStream, promise } = uploadObject({
    filename: newFilename,
    totalSize: Number(file.quotaBytesUsed),
    logPrefix,
  });
  fileStream.pipe(uploadStream);

  const res = await promise;
  console.log(logPrefix, { res });
}
