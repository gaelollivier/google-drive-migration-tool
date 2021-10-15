import AWS from 'aws-sdk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { PassThrough, Readable } from 'stream';

import { getFileStream } from './googleDownload';

const s3 = new AWS.S3({
  region: process.env['S3_REGION'],
  endpoint: process.env['S3_ENDPOINT'],
  s3BucketEndpoint: true,
});

// Setup access key
s3.config.update({
  accessKeyId: process.env['S3_ACCESS_KEY'],
  secretAccessKey: process.env['S3_SECRET_KEY'],
});

const Bucket = process.env['S3_BUCKET'] ?? '';

const listAllObjects = async () => {
  let allObjects: AWS.S3.ObjectList = [];

  async function fetchAllObjects(nextContinuationToken?: string) {
    const { Contents, ...res } = await s3
      .listObjectsV2({
        Bucket: 'gael-ollivier-backup',
        ContinuationToken: nextContinuationToken,
      })
      .promise();

    allObjects.push(...(Contents ?? []));

    console.log(res);

    if (res.IsTruncated) {
      await fetchAllObjects(res.NextContinuationToken);
    }
  }

  await fetchAllObjects();

  const totalSize = allObjects.reduce((acc, { Size }) => acc + (Size ?? 0), 0);

  console.log('Total objects:', allObjects.length);
  console.log(
    `Total size (GB): ${(totalSize / 1024 / 1024 / 1024).toFixed(2)}`
  );

  return allObjects;
};

export const uploadObject = ({
  filename,
  totalSize,
}: {
  filename: string;
  totalSize: number;
}) => {
  const Body = new PassThrough();

  console.log('Uploading', filename);
  const upload = s3.upload({
    Bucket: process.env['S3_BUCKET'] ?? '',
    Key: filename,
    Body,
    StorageClass: 'GLACIER',
  });

  let prevPercent = 0;
  upload.on('httpUploadProgress', ({ loaded }) => {
    const percent = Math.floor((loaded / totalSize) * 100);
    console.log(`Uploaded ${percent}%`);
  });
  upload.send((err, data) => {
    console.log('Uploaded', data);
  });

  return Body;
};

if (require.main === module) {
  (async () => {
    const allObjects = await listAllObjects();
    const toDelete = allObjects.filter((file) =>
      file.Key?.startsWith('Drive Backup')
    );
    console.log(toDelete);
    // s3.deleteObject({ Bucket, Key: toDelete[0]?.Key ?? '' }, (err, data) => {
    //   console.log(err, data);
    // });
  })();
}
