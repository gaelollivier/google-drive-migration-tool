import {
  getDriveClient,
  getFilePath,
  getFileStream,
  getLargestFiles,
} from './googleDownload';

if (module === require.main) {
  (async () => {
    const drive = await getDriveClient();
    const files = await getLargestFiles({ drive });

    const file = files[0];
    if (!file) {
      throw new Error('No file found');
    }

    const filePath = await getFilePath({ drive, file });
    const fileStream = await getFileStream({ drive, file });
  })();
}
