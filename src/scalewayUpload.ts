import { PassThrough } from 'stream';

import {
  HeadObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2Output,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const s3 = new S3Client({
  region: process.env['S3_REGION'],
  // endpoint: process.env['S3_ENDPOINT'],
  endpoint: 'https://s3.fr-par.scw.cloud',
  credentials: {
    accessKeyId: process.env['S3_ACCESS_KEY'] ?? '',
    secretAccessKey: process.env['S3_SECRET_KEY'] ?? '',
  },
});

const Bucket = process.env['S3_BUCKET'] ?? '';

export const objectExists = async (filename: string) => {
  try {
    await s3.send(new HeadObjectCommand({ Bucket, Key: filename }));

    return true;
  } catch (err) {
    if ((err as any).name === 'NotFound') {
      return false;
    }
    throw err;
  }
};

const listAllObjects = async () => {
  let allObjects: NonNullable<ListObjectsV2Output['Contents']> = [];

  async function fetchAllObjects(nextContinuationToken?: string) {
    const { Contents, ...res } = await s3.send(
      new ListObjectsV2Command({
        Bucket,
        ContinuationToken: nextContinuationToken,
      })
    );

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

// Force the total number of parts to be 500
// NOTE: Scaleway limits the total number of parts to 1000
const MAX_PARTS_COUNT = 500;
const MIN_CHUNK_SIZE = 1024 * 1024;

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

  const partSize = Math.max(MIN_CHUNK_SIZE, totalSize / MAX_PARTS_COUNT);

  console.log(
    logPrefix,
    `Uploading "${filename}" in ${Math.round(
      totalSize / partSize
    )} parts of ${Math.round(partSize / 1024 / 1024)} MB`
  );

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: process.env['S3_BUCKET'] ?? '',
      Key: filename,
      Body,
      StorageClass: 'GLACIER',
    },
    partSize,
  });

  let prevLoaded = { size: 0, time: Date.now() };
  // Keep track of last 10 speeds to get a moving avg
  let speeds: number[] = [];
  upload.on('httpUploadProgress', ({ loaded = 0 }) => {
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
    promise: upload.done(),
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
