import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

interface FrontendStackProps extends cdk.StackProps {
  environment: string;
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  domainName?: string;
  certificateArn?: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly distributionDomainName: string;
  public readonly bucketName: string;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { environment, apiUrl, userPoolId, userPoolClientId, domainName, certificateArn } = props;

    // S3 Bucket for hosting the React app
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `invoice-scanner-frontend-${environment}-${this.account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Origin Access Identity for CloudFront
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for Invoice Scanner ${environment}`,
    });

    websiteBucket.grantRead(originAccessIdentity);

    // CloudFront distribution configuration
    const distributionProps: cloudfront.DistributionProps = {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(apiUrl.replace('https://', '').replace('http://', '')),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        },
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(30),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(30),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      comment: `Invoice Scanner Frontend Distribution - ${environment}`,
    };

    // Add custom domain if provided
    if (domainName && certificateArn) {
      const certificate = acm.Certificate.fromCertificateArn(this, 'Certificate', certificateArn);
      distributionProps.domainNames = [domainName];
      distributionProps.certificate = certificate;
    }

    const distribution = new cloudfront.Distribution(this, 'Distribution', distributionProps);

    // Route53 record if custom domain is used
    if (domainName) {
      const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: domainName.split('.').slice(-2).join('.'), // Get root domain
      });

      new route53.ARecord(this, 'AliasRecord', {
        zone: hostedZone,
        recordName: domainName,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      });
    }

    // Create environment configuration file for the frontend
    const envConfig = {
      REACT_APP_API_URL: apiUrl,
      REACT_APP_USER_POOL_ID: userPoolId,
      REACT_APP_USER_POOL_CLIENT_ID: userPoolClientId,
      REACT_APP_REGION: this.region,
      REACT_APP_ENVIRONMENT: environment,
    };

    // Deploy the React app (placeholder for now)
    // This will be replaced with actual build artifacts in the CI/CD pipeline
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [
        s3deploy.Source.data('env.json', JSON.stringify(envConfig, null, 2)),
        s3deploy.Source.data(
          'index.html',
          `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice Scanner</title>
</head>
<body>
    <div id="root">
        <h1>Invoice Scanner - ${environment.toUpperCase()}</h1>
        <p>Frontend deployment placeholder</p>
        <p>API URL: ${apiUrl}</p>
    </div>
</body>
</html>`
        ),
      ],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Store outputs
    this.distributionDomainName = distribution.distributionDomainName;
    this.bucketName = websiteBucket.bucketName;

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distributionDomainName,
    });
    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: this.bucketName,
    });
    if (domainName) {
      new cdk.CfnOutput(this, 'CustomDomainName', {
        value: domainName,
      });
    }
  }
}
