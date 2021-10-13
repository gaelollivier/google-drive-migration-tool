import AWS from 'aws-sdk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { PassThrough, Readable } from 'stream';

import { getFileStream } from './googleDownload';

const s3 = new AWS.S3({
  region: 'fr-par',
  endpoint: 'https://gael-ollivier-backup.s3.fr-par.scw.cloud',
  s3BucketEndpoint: true,
});

// Setup access key
s3.config.update({
  accessKeyId: process.env['AWS_ACCESS_KEY'],
  secretAccessKey: process.env['AWS_SECRET_KEY'],
});

const SCALEWAY_OBJECTS_CACHE = 'scaleway-objects.json';

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

  if (existsSync(SCALEWAY_OBJECTS_CACHE)) {
    allObjects = JSON.parse(readFileSync(SCALEWAY_OBJECTS_CACHE, 'utf8'));
  } else {
    await fetchAllObjects();
    writeFileSync(SCALEWAY_OBJECTS_CACHE, JSON.stringify(allObjects, null, 2));
  }

  const totalSize = allObjects.reduce((acc, { Size }) => acc + (Size ?? 0), 0);

  console.log('Total objects:', allObjects.length);
  console.log(
    `Total size (GB): ${(totalSize / 1024 / 1024 / 1024).toFixed(2)}`
  );
};

const uploadObject = () => {
  const Body = new PassThrough();

  console.log('Start uploading');
  const upload = s3.upload({
    Bucket: 'gael-ollivier-backup',
    Key: 'test-upload.mp4',
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
    const stream = await getFileStream();
    stream.pipe(uploadObject());
  })();
}
