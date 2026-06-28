import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { TopspinStack } from '../lib/topspin-stack'

const app = new cdk.App()

new TopspinStack(app, 'TopspinStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  description: 'Topspin platform — API, database, and background processing',
})
