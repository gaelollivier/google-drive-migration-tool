import AWS from 'aws-sdk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { PassThrough, Readable } from 'stream';

import { getFileStream } from './googleDownload';

const s3 = new AWS.S3({
  endpoint: process.env['S3_ENDPOINT'],
  s3BucketEndpoint: true,
});

// Setup access key
s3.config.update({
  accessKeyId: process.env['S3_ACCESS_KEY'],
  secretAccessKey: process.env['S3_SECRET_KEY'],
});

const Bucket = process.env['S3_BUCKET'] ?? '';

const S3_OBJECTS_CACHE = 's3-objects.json';

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

  if (existsSync(S3_OBJECTS_CACHE)) {
    allObjects = JSON.parse(readFileSync(S3_OBJECTS_CACHE, 'utf8'));
  } else {
    await fetchAllObjects();
    writeFileSync(S3_OBJECTS_CACHE, JSON.stringify(allObjects, null, 2));
  }

  const totalSize = allObjects.reduce((acc, { Size }) => acc + (Size ?? 0), 0);

  console.log('Total objects:', allObjects.length);
  console.log(
    `Total size (GB): ${(totalSize / 1024 / 1024 / 1024).toFixed(2)}`
  );
};

const uploadObject = ({ filename }: { filename: string }) => {
  const Body = new PassThrough();

  console.log('Uploading', filename);
  const upload = s3.upload({
    Bucket: process.env['S3_BUCKET'] ?? '',
    Key: `Test/${filename}`,
    Body,
    StorageClass: 'GLACIER',
  });

  let prevPercent = 0;
  upload.on('httpUploadProgress', ({ loaded }) => {
    // Log loaded in MB
    console.log((loaded / 1024 / 1024).toFixed(2), 'MB');
  });
  upload.send((err, data) => {
    console.log('Uploaded', data);
  });

  return Body;
};

if (require.main === module) {
  (async () => {
    // const stream = await getFileStream();
    // stream.pipe(uploadObject());
    // const res = await s3
    //   .deleteObject({ Bucket, Key: 'Drive Backup' })
    //   .promise();
    // console.log(res);
  })();
}
