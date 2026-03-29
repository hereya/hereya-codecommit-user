#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { HereyaCodecommitUserStack } from '../lib/hereya-codecommit-user-stack';

const app = new cdk.App();
new HereyaCodecommitUserStack(app, process.env.STACK_NAME!, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
