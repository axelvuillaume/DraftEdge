const { S3_ACCESSKEYID, S3_ENDPOINT, S3_SECRETACCESSKEY, S3_BUCKET } = require('../config');

const AWS = require('aws-sdk');

// Stockage objet compatible S3 (Cloudflare R2). Bucket privé : R2 ne supporte pas les ACL,
// la lecture passe toujours par une URL présignée à durée courte (getSignedDownloadUrl).
let s3Client = null;
function s3() {
  if (s3Client) return s3Client;
  s3Client = new AWS.S3({
    endpoint: S3_ENDPOINT,
    accessKeyId: S3_ACCESSKEYID,
    secretAccessKey: S3_SECRETACCESSKEY,
    signatureVersion: 'v4',
    region: 'auto',
  });
  return s3Client;
}

function isS3Configured() {
  return Boolean(S3_ENDPOINT && S3_ACCESSKEYID && S3_SECRETACCESSKEY && S3_BUCKET);
}

async function uploadToS3FromBuffer(key, buffer, contentType) {
  const data = await s3().upload({ Bucket: S3_BUCKET, Key: key, Body: buffer, ContentType: contentType }).promise();
  return data.Location;
}

function getSignedDownloadUrl(key, { expires = 600, filename } = {}) {
  const params = { Bucket: S3_BUCKET, Key: key, Expires: expires };
  if (filename) params.ResponseContentDisposition = `attachment; filename="${filename}"`;
  return s3().getSignedUrl('getObject', params);
}

function deleteFromS3(key) {
  return s3().deleteObject({ Bucket: S3_BUCKET, Key: key }).promise();
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return false;
  }

  // Au moins 8 caractères
  if (password.length < 8) {
    return false;
  }

  // // Au moins une majuscule
  // if (!/[A-Z]/.test(password)) {
  //   return false;
  // }

  // // Au moins une minuscule
  // if (!/[a-z]/.test(password)) {
  //   return false;
  // }

  // // Au moins un chiffre
  // if (!/[0-9]/.test(password)) {
  //   return false;
  // }

  return true;
}

const BREVO_TEMPLATES = {};

module.exports = {
  isS3Configured,
  uploadToS3FromBuffer,
  getSignedDownloadUrl,
  deleteFromS3,
  validatePassword,
  BREVO_TEMPLATES,
};
