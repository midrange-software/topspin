import { App } from '@octokit/app'

let _app: App | null = null

export const getGitHubApp = () => {
  if (!_app) {
    _app = new App({
      appId: process.env.GITHUB_APP_ID!,
      // Secrets Manager preserves newlines; env var injection may encode them
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      webhooks: {
        secret: process.env.GITHUB_WEBHOOK_SECRET!,
      },
    })
  }
  return _app
}
