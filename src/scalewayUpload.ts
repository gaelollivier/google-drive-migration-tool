import AWS from 'aws-sdk';
import { PassThrough } from 'stream';

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

export const objectExists = async (filename: string) => {
  try {
    await s3.headObject({ Bucket, Key: filename }).promise();

    return true;
  } catch (err) {
    if ((err as any).code === 'NotFound') {
      return false;
    }
    throw err;
  }
};

const listAllObjects = async () => {
  let allObjects: AWS.S3.ObjectList = [];

  async function fetchAllObjects(nextContinuationToken?: string) {
    const { Contents, ...res } = await s3
      .listObjectsV2({
        Bucket,
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
  logPrefix,
}: {
  filename: string;
  totalSize: number;
  logPrefix: string;
}) => {
  const Body = new PassThrough();

  console.log(logPrefix, `Uploading "${filename}"`);
  const upload = s3.upload(
    {
      Bucket: process.env['S3_BUCKET'] ?? '',
      Key: filename,
      Body,
      StorageClass: 'GLACIER',
    },
    {
      // Force the total number of parts to be 100
      // NOTE: Scaleway limits the total number of parts to 1000
      partSize: totalSize / 100,
    }
  );

  let prevLoaded = { size: 0, time: Date.now() };
  // Keep track of last 10 speeds to get a moving avg
  let speeds: number[] = [];
  upload.on('httpUploadProgress', ({ loaded }) => {
    const now = Date.now();
    const deltaSize = loaded - prevLoaded.size;
    const deltaTime = now - prevLoaded.time;
    const speed = deltaSize / (deltaTime / 1000);
    speeds = [speed, ...speeds.slice(0, 9)];
    const avgSpeed =
      speeds.reduce((acc, speed) => acc + speed, 0) / speeds.length;

    const percent = Math.floor((loaded / totalSize) * 100);
    console.log(
      logPrefix,
      `Uploaded ${percent}%, ${(avgSpeed / 1024 / 1024).toFixed(1)}MB/s`
    );
    prevLoaded = { size: loaded, time: now };
  });

  return {
    uploadStream: Body,
    promise: new Promise((resolve, reject) => {
      upload.send((err, data) => {
        if (err) {
          reject(err);
        }
        resolve(data);
      });
    }),
  };
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
