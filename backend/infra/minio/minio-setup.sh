#!/bin/sh
# Prepares the test MinIO (`_standards/tooling.md` §8.4): the two buckets
# (dev and test, separated for the same reason as DATABASE_URL), closed to
# anonymous reads, and the application user with minimum scope. The root only exists
# for this script; the application comes in with STORAGE_KEY/STORAGE_SECRET.
#
# Usage: minio-setup.sh <endpoint>, with MINIO_ROOT_USER, MINIO_ROOT_PASSWORD,
# STORAGE_KEY, STORAGE_SECRET and STORAGE_BUCKET in the environment.
set -eu

endpoint="${1:-http://minio:9000}"

mc alias set local "$endpoint" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

for bucket in "$STORAGE_BUCKET" "$STORAGE_BUCKET-test"; do
  mc mb --ignore-existing "local/$bucket"
  mc anonymous set none "local/$bucket"
done

cat > /tmp/app-policy.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": [
        "arn:aws:s3:::$STORAGE_BUCKET/*",
        "arn:aws:s3:::$STORAGE_BUCKET-test/*"
      ]
    }
  ]
}
JSON

mc admin policy create local app-rw /tmp/app-policy.json || true
mc admin user add local "$STORAGE_KEY" "$STORAGE_SECRET"
mc admin policy attach local app-rw --user "$STORAGE_KEY" || true
