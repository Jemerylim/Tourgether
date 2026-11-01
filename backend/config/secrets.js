const AWS = require('aws-sdk');
const { config } = require('./env');

// Load secrets from AWS Secrets Manager (production).
// Every key in the secret's JSON becomes an environment variable, e.g. CLIENT_URL.
async function loadSecrets() {
  if (!config.awsSecretId) return;

  try {
    const secretsManager = new AWS.SecretsManager({ region: config.awsRegion });
    const secretValue = await secretsManager.getSecretValue({ SecretId: config.awsSecretId }).promise();
    if (secretValue.SecretString) {
      Object.assign(process.env, JSON.parse(secretValue.SecretString));
    }
  } catch (error) {
    console.error('❌ Error loading secrets from AWS Secrets Manager:', error);
  }
}

module.exports = loadSecrets;
