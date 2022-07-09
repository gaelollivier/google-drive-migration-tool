import { migrate } from './commands/migrate';
import { permanentlyDeleteUploadedFiles } from './commands/permanentlyDeleteUploadedFiles';
import { getDb, runDbQuery } from './db';

async function listAllUploadedFiles() {
  const allFiles = await runDbQuery(async (db) => {
    return db.collection('files').find({ status: 'uploaded' }).toArray();
  });
  console.log(allFiles.map((f) => f['filePath']).join('\n'));
}

(async () => {
  const cmd = process.argv.slice(-1)[0];
  if (cmd === 'list-uploaded') {
    await listAllUploadedFiles();
  } else if (cmd === 'permanently-delete-uploaded') {
    await permanentlyDeleteUploadedFiles();
  } else {
    await migrate();
  }
  await getDb().then(({ client }) => client.close());
})();
