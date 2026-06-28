import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
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

    // Neon database URL — created manually in AWS Secrets Manager before first deploy:
    // aws secretsmanager create-secret --name topspin/database-url --secret-string "postgresql://..."
    const dbUrlSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'DbUrlSecret',
      'topspin/database-url'
    )

    // Auth secret auto-generated on first deploy
    const authSecret = new secretsmanager.Secret(this, 'AuthSecret', {
      secretName: 'topspin/auth-secret',
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 64,
      },
    })

    // Background processing queue (consumed by workers in Phase 2+)
    const backgroundDlq = new sqs.Queue(this, 'BackgroundDlq', {
      queueName: 'topspin-background-dlq',
      retentionPeriod: cdk.Duration.days(14),
    })

    const backgroundQueue = new sqs.Queue(this, 'BackgroundQueue', {
      queueName: 'topspin-background',
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: backgroundDlq,
      },
    })

    // Structured log group
    const logGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: '/topspin/api',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // API Lambda — points to the pre-built bundle from packages/api/dist
    const apiFunction = new lambda.Function(this, 'ApiFunction', {
      functionName: 'topspin-api',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../packages/api/dist')
      ),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      logGroup,
      environment: {
        NODE_ENV: 'production',
        // CloudFormation resolves these dynamic references server-side at deploy time
        DATABASE_URL: dbUrlSecret.secretValue.unsafeUnwrap(),
        BETTER_AUTH_SECRET: authSecret.secretValue.unsafeUnwrap(),
        BACKGROUND_QUEUE_URL: backgroundQueue.queueUrl,
      },
    })

    dbUrlSecret.grantRead(apiFunction)
    authSecret.grantRead(apiFunction)
    backgroundQueue.grantSendMessages(apiFunction)

    // API Gateway HTTP API (v2)
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
      integration: new integrations.HttpLambdaIntegration(
        'ApiIntegration',
        apiFunction
      ),
    })

    // Better Auth needs the public API URL for generating callback URLs
    apiFunction.addEnvironment('API_URL', httpApi.url!)

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
