import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { BackspinStack } from '../lib/backspin-stack'

const app = new cdk.App()

new BackspinStack(app, 'BackspinStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  description: 'Backspin platform — API, database, and background processing',
})
