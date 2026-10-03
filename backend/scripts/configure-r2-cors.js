require("dotenv").config();

const {
  S3Client,
  PutBucketCorsCommand,
} = require("@aws-sdk/client-s3");

const requiredEnv = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
];
const missing = requiredEnv.filter((name) => !process.env[name]);

if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const origins = (process.env.R2_CORS_ORIGINS || process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!origins.length) {
  throw new Error("Set R2_CORS_ORIGINS or CORS_ORIGIN before configuring R2.");
}

const client = new S3Client({
  region: "auto",
  endpoint:
    process.env.R2_ENDPOINT ||
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const corsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: origins,
      AllowedMethods: ["PUT", "GET", "HEAD"],
      AllowedHeaders: ["Content-Type"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    },
  ],
};

client
  .send(
    new PutBucketCorsCommand({
      Bucket: process.env.R2_BUCKET,
      CORSConfiguration: corsConfiguration,
    }),
  )
  .then(() => {
    console.log(
      `Configured R2 CORS for ${process.env.R2_BUCKET}: ${origins.join(", ")}`,
    );
  })
  .catch((error) => {
    console.error(`Failed to configure R2 CORS: ${error.message}`);
    process.exitCode = 1;
  });