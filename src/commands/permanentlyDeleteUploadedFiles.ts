import { getScalewayPath, isFileInScaleway } from '../backupLargeFiles';
import { runDbQuery } from '../db';
import {
  getDriveClient,
  getFilePath,
  permanentlyDeleteFile,
} from '../googleDownload';
import { getObjectMetadata, objectExists } from '../scalewayUpload';

export async function permanentlyDeleteUploadedFiles() {
  const drive = await getDriveClient();

  const allFiles = await runDbQuery(async (db) => {
    return db.collection('files').find({ status: 'uploaded' }).toArray();
  });

  for (const [index, file] of allFiles.entries()) {
    const filePath = await getFilePath({
      drive,
      // NOTE: we expect the file to be stored as retrieved by google drive
      file: file['file'] as any,
    });

    const fileId = file['file'].id;

    console.log(
      `${index + 1}/${allFiles.length} Checking file ${fileId} -> ${filePath}`
    );

    const exists = await isFileInScaleway(getScalewayPath(filePath));
    if (!exists) {
      console.log(
        `${index + 1}/${
          allFiles.length
        } File not found in Scaleway, NOT DELETING FROM DRIVE!`
      );
      return;
    }

    const scalewayMeta = await getObjectMetadata(getScalewayPath(filePath));
    if (scalewayMeta.ContentLength !== Number(file['file'].quotaBytesUsed)) {
      console.log(
        `${index + 1}/${
          allFiles.length
        } Filesize doesn't match, NOT DELETING FROM DRIVE!`,
        scalewayMeta.ContentLength,
        file['file'].quotaBytesUsed
      );
      return;
    }

    console.log(
      `${index + 1}/${
        allFiles.length
      } Permanently deleting file ${fileId} -> ${filePath}`
    );

    await permanentlyDeleteFile({ drive, fileId });
    console.log(`${index + 1}/${allFiles.length} File deleted from Drive`);

    await runDbQuery(async (db) => {
      await db
        .collection('files')
        .findOneAndUpdate(
          { _id: file._id },
          { $set: { file, filePath, status: 'deleted' } },
          { upsert: true }
        );
    });

    // Sleep 1s (for safety, so we can kill if things go wrong)
    // await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
