import * as cdk from 'aws-cdk-lib/core';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export class HereyaCodecommitUserStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── IAM User for CodeCommit Git HTTPS credentials ──
    const gitUser = new iam.User(this, 'CodecommitUser', {
      userName: `${this.stackName}-codecommit-user`,
    });

    // Create HTTPS Git credentials via AwsCustomResource (no native CFN resource exists)
    const gitCredential = new cr.AwsCustomResource(this, 'GitCredential', {
      onCreate: {
        service: 'IAM',
        action: 'createServiceSpecificCredential',
        parameters: {
          UserName: gitUser.userName,
          ServiceName: 'codecommit.amazonaws.com',
        },
        physicalResourceId: cr.PhysicalResourceId.fromResponse(
          'ServiceSpecificCredential.ServiceSpecificCredentialId',
        ),
      },
      onDelete: {
        service: 'IAM',
        action: 'deleteServiceSpecificCredential',
        parameters: {
          UserName: gitUser.userName,
          ServiceSpecificCredentialId: new cr.PhysicalResourceIdReference(),
        },
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            'iam:CreateServiceSpecificCredential',
            'iam:DeleteServiceSpecificCredential',
          ],
          resources: [gitUser.userArn],
        }),
      ]),
    });
    gitCredential.node.addDependency(gitUser);

    const gitUsername = gitCredential.getResponseField(
      'ServiceSpecificCredential.ServiceUserName',
    );
    const gitPassword = gitCredential.getResponseField(
      'ServiceSpecificCredential.ServicePassword',
    );

    // Store the Git password in Secrets Manager
    const gitPasswordSecret = new secretsmanager.Secret(this, 'GitPasswordSecret', {
      secretName: `${this.stackName}/codecommit-git-password`,
      description: `CodeCommit Git password for ${this.stackName}`,
      secretStringValue: cdk.SecretValue.unsafePlainText(gitPassword),
    });

    // ── Outputs ──
    new cdk.CfnOutput(this, 'hereyaCodecommitUsername', {
      value: gitUsername,
      description: 'CodeCommit Git HTTPS username',
    });

    new cdk.CfnOutput(this, 'hereyaCodecommitPassword', {
      value: gitPasswordSecret.secretArn,
      description: 'Secrets Manager ARN for CodeCommit Git password (auto-resolved by Hereya)',
    });

    new cdk.CfnOutput(this, 'hereyaCodecommitIamUserName', {
      value: gitUser.userName,
      description: 'IAM user name for CodeCommit access',
    });

    new cdk.CfnOutput(this, 'hereyaCodecommitUserArn', {
      value: gitUser.userArn,
      description: 'IAM user ARN for CodeCommit access',
    });
  }
}
