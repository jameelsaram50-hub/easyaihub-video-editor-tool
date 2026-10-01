const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_BASE = (process.env.R2_PUBLIC_BASE || '').replace(/\/+$/, '');

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('Error: Missing R2 environment variables in .env file.');
  process.exit(1);
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) parsed.file = args[++i];
    else if (args[i] === '--version' && args[i + 1]) parsed.version = args[++i];
    else if (args[i] === '--notes' && args[i + 1]) parsed.notes = args[++i];
  }
  return parsed;
}

async function computeSha512(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha512');
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('base64')));
    stream.on('error', reject);
  });
}

async function uploadToR2(key, body, contentType) {
  console.log(`Uploading ${key} (${contentType})...`);
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType
  });
  await s3Client.send(command);
  console.log(`Uploaded: ${key}`);
}

async function run() {
  const { file: inputPath, version, notes } = parseArgs();

  if (!inputPath || !version) {
    console.error('Usage: node scripts/publish-to-r2.js --version <semver> --file <path-to-exe> [--notes "Release notes"]');
    process.exit(1);
  }

  const absoluteFilePath = path.resolve(inputPath);
  if (!fs.existsSync(absoluteFilePath)) {
    console.error(`Error: File not found at ${absoluteFilePath}`);
    process.exit(1);
  }

  const fileName = path.basename(absoluteFilePath);
  const fileStat = fs.statSync(absoluteFilePath);
  const fileSize = fileStat.size;

  console.log(`Calculating Base64 SHA-512 for ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`);
  const sha512Base64 = await computeSha512(absoluteFilePath);
  console.log(`Computed SHA-512 (Base64): ${sha512Base64}`);

  const releaseDate = new Date().toISOString();

  const latestYmlContent = `version: ${version}
files:
  - url: ${fileName}
    sha512: ${sha512Base64}
    size: ${fileSize}
path: ${fileName}
sha512: ${sha512Base64}
releaseDate: '${releaseDate}'
`;

  const latestJsonContent = JSON.stringify({
    version,
    releaseDate,
    fileName,
    size: fileSize,
    sha512: sha512Base64,
    downloadUrl: R2_PUBLIC_BASE ? `${R2_PUBLIC_BASE}/${fileName}` : fileName,
    releaseNotes: notes || ''
  }, null, 2);

  const prefix = R2_PUBLIC_BASE.includes('/releases') ? 'releases/' : '';

  console.log('\n--- Starting Cloudflare R2 Uploads ---');
  await uploadToR2(`${prefix}${fileName}`, fs.createReadStream(absoluteFilePath), 'application/vnd.microsoft.portable-executable');
  await uploadToR2(`${prefix}latest.yml`, Buffer.from(latestYmlContent, 'utf-8'), 'text/yaml');
  await uploadToR2(`${prefix}latest.json`, Buffer.from(latestJsonContent, 'utf-8'), 'application/json');

  console.log('\n=========================================');
  console.log(' Release published successfully to R2!');
  console.log(` Version:     ${version}`);
  console.log(` File:        ${fileName}`);
  console.log(` SHA-512:     ${sha512Base64}`);
  if (R2_PUBLIC_BASE) {
    console.log(` Download:    ${R2_PUBLIC_BASE}/${fileName}`);
    console.log(` latest.yml:  ${R2_PUBLIC_BASE}/latest.yml`);
    console.log(` latest.json: ${R2_PUBLIC_BASE}/latest.json`);
  }
  console.log('=========================================');
}

run().catch((err) => {
  console.error('Publish failed:', err);
  process.exit(1);
});
