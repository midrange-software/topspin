import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources'
import * as events from 'aws-cdk-lib/aws-events'
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets'
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'
import * as path from 'path'

export class TopspinStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // ── Secrets ────────────────────────────────────────────────────────────────
    // Created manually before first deploy:
    //   aws secretsmanager create-secret --name topspin/database-url --secret-string "postgresql://..."
    //   aws secretsmanager create-secret --name topspin/github-app-id --secret-string "<app-id>"
    //   aws secretsmanager create-secret --name topspin/github-app-private-key --secret-string "<pem>"
    //   aws secretsmanager create-secret --name topspin/github-webhook-secret --secret-string "<secret>"
    //   aws secretsmanager create-secret --name topspin/jira-client-id --secret-string "<client-id>"
    //   aws secretsmanager create-secret --name topspin/jira-client-secret --secret-string "<client-secret>"
    const dbUrlSecret = secretsmanager.Secret.fromSecretNameV2(this, 'DbUrlSecret', 'topspin/database-url')
    const githubAppIdSecret = secretsmanager.Secret.fromSecretNameV2(this, 'GitHubAppId', 'topspin/github-app-id')
    const githubPrivateKeySecret = secretsmanager.Secret.fromSecretNameV2(this, 'GitHubPrivateKey', 'topspin/github-app-private-key')
    const githubWebhookSecret = secretsmanager.Secret.fromSecretNameV2(this, 'GitHubWebhookSecret', 'topspin/github-webhook-secret')
    const jiraClientIdSecret = secretsmanager.Secret.fromSecretNameV2(this, 'JiraClientId', 'topspin/jira-client-id')
    const jiraClientSecretSecret = secretsmanager.Secret.fromSecretNameV2(this, 'JiraClientSecret', 'topspin/jira-client-secret')

    const authSecret = new secretsmanager.Secret(this, 'AuthSecret', {
      secretName: 'topspin/auth-secret',
      generateSecretString: { excludePunctuation: true, passwordLength: 64 },
    })

    // ── Queues ─────────────────────────────────────────────────────────────────
    const backgroundDlq = new sqs.Queue(this, 'BackgroundDlq', {
      queueName: 'topspin-background-dlq',
      retentionPeriod: cdk.Duration.days(14),
    })

    const backgroundQueue = new sqs.Queue(this, 'BackgroundQueue', {
      queueName: 'topspin-background',
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: { maxReceiveCount: 3, queue: backgroundDlq },
    })

    // ── Shared environment ─────────────────────────────────────────────────────
    const sharedEnv: Record<string, string> = {
      NODE_ENV: 'production',
      DATABASE_URL_SECRET_ARN: dbUrlSecret.secretArn,
      BETTER_AUTH_SECRET_ARN: authSecret.secretArn,
      GITHUB_APP_ID_SECRET_ARN: githubAppIdSecret.secretArn,
      GITHUB_APP_PRIVATE_KEY_SECRET_ARN: githubPrivateKeySecret.secretArn,
      JIRA_CLIENT_ID_SECRET_ARN: jiraClientIdSecret.secretArn,
      JIRA_CLIENT_SECRET_SECRET_ARN: jiraClientSecretSecret.secretArn,
    }

    const grantSharedSecretRead = (fn: lambda.Function) => {
      dbUrlSecret.grantRead(fn)
      authSecret.grantRead(fn)
      githubAppIdSecret.grantRead(fn)
      githubPrivateKeySecret.grantRead(fn)
      jiraClientIdSecret.grantRead(fn)
      jiraClientSecretSecret.grantRead(fn)
    }

    // ── Lambda: Worker ─────────────────────────────────────────────────────────
    const workerFunction = new lambda.Function(this, 'WorkerFunction', {
      functionName: 'topspin-worker',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'worker.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../packages/api/dist')),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(300),
      logGroup: new logs.LogGroup(this, 'WorkerLogGroup', {
        logGroupName: '/topspin/worker',
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      environment: sharedEnv,
    })

    workerFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(backgroundQueue, {
        batchSize: 10,
        reportBatchItemFailures: true,
      })
    )

    grantSharedSecretRead(workerFunction)

    // ── Lambda: Reconciler (scheduled Jira full-sync) ──────────────────────────
    const reconcilerFunction = new lambda.Function(this, 'ReconcilerFunction', {
      functionName: 'topspin-reconciler',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'reconciler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../packages/api/dist')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(60),
      logGroup: new logs.LogGroup(this, 'ReconcilerLogGroup', {
        logGroupName: '/topspin/reconciler',
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      environment: {
        NODE_ENV: 'production',
        DATABASE_URL_SECRET_ARN: dbUrlSecret.secretArn,
        BACKGROUND_QUEUE_URL: backgroundQueue.queueUrl,
      },
    })

    dbUrlSecret.grantRead(reconcilerFunction)
    backgroundQueue.grantSendMessages(reconcilerFunction)

    new events.Rule(this, 'ReconcilerSchedule', {
      ruleName: 'topspin-jira-reconcile',
      description: 'Enqueue a full Jira sync for every active connection every 6 hours',
      schedule: events.Schedule.rate(cdk.Duration.hours(6)),
      targets: [new eventsTargets.LambdaFunction(reconcilerFunction)],
    })

    // ── Lambda: API ────────────────────────────────────────────────────────────
    const apiFunction = new lambda.Function(this, 'ApiFunction', {
      functionName: 'topspin-api',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../packages/api/dist')),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      logGroup: new logs.LogGroup(this, 'ApiLogGroup', {
        logGroupName: '/topspin/api',
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      environment: {
        ...sharedEnv,
        GITHUB_WEBHOOK_SECRET_ARN: githubWebhookSecret.secretArn,
        BACKGROUND_QUEUE_URL: backgroundQueue.queueUrl,
      },
    })

    grantSharedSecretRead(apiFunction)
    githubWebhookSecret.grantRead(apiFunction)
    backgroundQueue.grantSendMessages(apiFunction)

    // ── API Gateway ────────────────────────────────────────────────────────────
    const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: 'topspin-api',
      description: 'Topspin backend API',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
        allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
        allowCredentials: true,
      },
    })

    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: new integrations.HttpLambdaIntegration('ApiIntegration', apiFunction),
    })

    apiFunction.addEnvironment('API_URL', httpApi.url!)

    // ── Outputs ────────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.url!,
      description: 'API Gateway endpoint URL',
      exportName: 'TopspinApiUrl',
    })

    new cdk.CfnOutput(this, 'BackgroundQueueUrl', {
      value: backgroundQueue.queueUrl,
      description: 'Background processing SQS queue URL',
      exportName: 'TopspinBackgroundQueueUrl',
    })
  }
}
