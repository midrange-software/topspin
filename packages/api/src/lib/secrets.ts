import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

let client: SecretsManagerClient | null = null

function getClient() {
  if (!client) client = new SecretsManagerClient({})
  return client
}

async function resolveSecret(arnVar: string, fallbackVar: string): Promise<string> {
  const arn = process.env[arnVar]
  if (arn) {
    const res = await getClient().send(new GetSecretValueCommand({ SecretId: arn }))
    return res.SecretString!
  }
  const val = process.env[fallbackVar]
  if (!val) throw new Error(`Missing required env var: ${fallbackVar}`)
  return val
}

export async function loadSecrets(): Promise<void> {
  const [dbUrl, authSecret, ghAppId, ghPrivateKey, jiraClientId, jiraClientSecret] =
    await Promise.all([
      resolveSecret('DATABASE_URL_SECRET_ARN', 'DATABASE_URL'),
      resolveSecret('BETTER_AUTH_SECRET_ARN', 'BETTER_AUTH_SECRET'),
      resolveSecret('GITHUB_APP_ID_SECRET_ARN', 'GITHUB_APP_ID'),
      resolveSecret('GITHUB_APP_PRIVATE_KEY_SECRET_ARN', 'GITHUB_APP_PRIVATE_KEY'),
      resolveSecret('JIRA_CLIENT_ID_SECRET_ARN', 'JIRA_CLIENT_ID'),
      resolveSecret('JIRA_CLIENT_SECRET_SECRET_ARN', 'JIRA_CLIENT_SECRET'),
    ])

  process.env.DATABASE_URL = dbUrl
  process.env.BETTER_AUTH_SECRET = authSecret
  process.env.GITHUB_APP_ID = ghAppId
  process.env.GITHUB_APP_PRIVATE_KEY = ghPrivateKey
  process.env.JIRA_CLIENT_ID = jiraClientId
  process.env.JIRA_CLIENT_SECRET = jiraClientSecret

  if (process.env.GITHUB_WEBHOOK_SECRET_ARN) {
    process.env.GITHUB_WEBHOOK_SECRET = await resolveSecret('GITHUB_WEBHOOK_SECRET_ARN', 'GITHUB_WEBHOOK_SECRET')
  }
}
