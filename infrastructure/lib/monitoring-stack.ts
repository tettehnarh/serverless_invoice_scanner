import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';

interface MonitoringStackProps extends cdk.StackProps {
  environment: string;
  apiGatewayId: string;
  lambdaFunctions: lambda.Function[];
  dynamoTableName: string;
  s3BucketName: string;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { environment, apiGatewayId, lambdaFunctions, dynamoTableName, s3BucketName } = props;

    // SNS Topic for alerts
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `invoice-scanner-alerts-${environment}`,
      displayName: `Invoice Scanner Alerts - ${environment}`,
    });

    // Add email subscription (replace with your email)
    alertTopic.addSubscription(
      new subscriptions.EmailSubscription('your-email@example.com')
    );

    // CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `InvoiceScanner-${environment}`,
    });

    // API Gateway metrics
    const apiWidget = new cloudwatch.GraphWidget({
      title: 'API Gateway Metrics',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Count',
          dimensionsMap: {
            ApiName: `invoice-scanner-api-${environment}`,
          },
          statistic: 'Sum',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '4XXError',
          dimensionsMap: {
            ApiName: `invoice-scanner-api-${environment}`,
          },
          statistic: 'Sum',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '5XXError',
          dimensionsMap: {
            ApiName: `invoice-scanner-api-${environment}`,
          },
          statistic: 'Sum',
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Latency',
          dimensionsMap: {
            ApiName: `invoice-scanner-api-${environment}`,
          },
          statistic: 'Average',
        }),
      ],
    });

    dashboard.addWidgets(apiWidget);

    // Lambda metrics
    lambdaFunctions.forEach((func, index) => {
      const lambdaWidget = new cloudwatch.GraphWidget({
        title: `Lambda: ${func.functionName}`,
        left: [
          func.metricInvocations(),
          func.metricErrors(),
          func.metricThrottles(),
        ],
        right: [
          func.metricDuration(),
        ],
      });

      dashboard.addWidgets(lambdaWidget);

      // Error rate alarm
      const errorAlarm = new cloudwatch.Alarm(this, `${func.functionName}ErrorAlarm`, {
        alarmName: `${func.functionName}-ErrorRate-${environment}`,
        metric: func.metricErrors({
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      errorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

      // Duration alarm
      const durationAlarm = new cloudwatch.Alarm(this, `${func.functionName}DurationAlarm`, {
        alarmName: `${func.functionName}-Duration-${environment}`,
        metric: func.metricDuration({
          period: cdk.Duration.minutes(5),
          statistic: 'Average',
        }),
        threshold: func.timeout?.toMilliseconds() ? func.timeout.toMilliseconds() * 0.8 : 30000,
        evaluationPeriods: 3,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      durationAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
    });

    // DynamoDB metrics
    const dynamoWidget = new cloudwatch.GraphWidget({
      title: 'DynamoDB Metrics',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ConsumedReadCapacityUnits',
          dimensionsMap: {
            TableName: dynamoTableName,
          },
          statistic: 'Sum',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ConsumedWriteCapacityUnits',
          dimensionsMap: {
            TableName: dynamoTableName,
          },
          statistic: 'Sum',
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'SuccessfulRequestLatency',
          dimensionsMap: {
            TableName: dynamoTableName,
            Operation: 'Query',
          },
          statistic: 'Average',
        }),
      ],
    });

    dashboard.addWidgets(dynamoWidget);

    // S3 metrics
    const s3Widget = new cloudwatch.GraphWidget({
      title: 'S3 Metrics',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/S3',
          metricName: 'NumberOfObjects',
          dimensionsMap: {
            BucketName: s3BucketName,
            StorageType: 'AllStorageTypes',
          },
          statistic: 'Average',
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: 'AWS/S3',
          metricName: 'BucketSizeBytes',
          dimensionsMap: {
            BucketName: s3BucketName,
            StorageType: 'StandardStorage',
          },
          statistic: 'Average',
        }),
      ],
    });

    dashboard.addWidgets(s3Widget);

    // Custom business metrics
    const businessMetricsWidget = new cloudwatch.GraphWidget({
      title: 'Business Metrics',
      left: [
        new cloudwatch.Metric({
          namespace: 'InvoiceScanner',
          metricName: 'InvoicesProcessed',
          statistic: 'Sum',
        }),
        new cloudwatch.Metric({
          namespace: 'InvoiceScanner',
          metricName: 'ProcessingErrors',
          statistic: 'Sum',
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: 'InvoiceScanner',
          metricName: 'ProcessingDuration',
          statistic: 'Average',
        }),
      ],
    });

    dashboard.addWidgets(businessMetricsWidget);

    // API Gateway error rate alarm
    const apiErrorAlarm = new cloudwatch.Alarm(this, 'ApiErrorAlarm', {
      alarmName: `API-ErrorRate-${environment}`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: {
          ApiName: `invoice-scanner-api-${environment}`,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    apiErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: alertTopic.topicArn,
    });
  }
}
