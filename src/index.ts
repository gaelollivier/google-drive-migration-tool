import {
  getDriveClient,
  getFilePath,
  getFileStream,
  getLargestFiles,
} from './googleDownload';
import { uploadObject } from './scalewayUpload';

if (module === require.main) {
  (async () => {
    const drive = await getDriveClient();
    const files = await getLargestFiles({ drive });

    const file = files.slice(-1)[0];
    if (!file) {
      throw new Error('No file found');
    }

    const filePath = await getFilePath({ drive, file });
    const fileStream = await getFileStream({ drive, file });

    const uploadStream = uploadObject({
      filename: `Drive Backup/${filePath}`,
      totalSize: Number(file.quotaBytesUsed),
    });
    fileStream.pipe(uploadStream);
  })();
}
