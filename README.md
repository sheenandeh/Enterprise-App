# Nebulance EKS - Enterprise Application Platform

A production-ready 3-tier web application deployed on Amazon EKS using Infrastructure as Code, container orchestration, and secure secrets management.

## Application Overview

This project consists of a complete 3-tier application:
- **Frontend**: React.js with authentication and dashboard features
- **Backend**: Node.js REST API with PostgreSQL integration
- **Database**: PostgreSQL with persistent storage

## Prerequisites

- AWS CLI configured with appropriate permissions
- Terraform installed (v1.0+)
- kubectl installed
- Helm installed (v3.0+)
- Docker installed
- CircleCI account connected to your GitHub repository

## Deployment Steps

### 1. Infrastructure Provisioning with Terraform

```bash
# Clone the repository
git clone https://github.com/sheenandeh/Enterprise-App.git
cd Enterprise-App/terraform

# Initialize Terraform
terraform init

# Plan the deployment
terraform plan -out=tfplan

# Apply the configuration
terraform apply tfplan
```

Key Terraform resources:
- EKS cluster named "eks-nebulance" in eu-central-1
- VPC with public and private subnets across 3 AZs
- IAM roles with IRSA capability for External Secrets Operator
- Auto-scaling node groups with t3.medium instances
- KMS encryption for cluster secrets

### 2. Configure kubectl

```bash
aws eks update-kubeconfig --name eks-nebulance --region eu-central-1
```

### 3. Install AWS Load Balancer Controller

```bash
# Set your AWS account ID as a variable
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)

# Download the IAM policy document for AWS Load Balancer Controller
curl -o iam_policy_lb.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.4.7/docs/install/iam_policy.json

# Create IAM policy for AWS Load Balancer Controller
# This policy allows the controller to make necessary AWS API calls to manage load balancers
aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam_policy_lb.json

# Create service account with IAM role (IRSA - IAM Roles for Service Accounts)
# This links the Kubernetes service account to the AWS IAM role, enabling the controller to use AWS permissions
eksctl create iamserviceaccount \
  --cluster=eks-nebulance \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::${AWS_ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy \
  --override-existing-serviceaccounts \
  --approve

# Install AWS Load Balancer Controller using Helm
# This deploys the controller that will manage AWS ALB/NLB resources based on Kubernetes Ingress/Service resources
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=eks-nebulance \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

### 4. Install EBS CSI Driver as an EKS Add-on

```bash
# Set your AWS account ID as a variable
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)

# Enable the EBS CSI Driver as an EKS add-on
# This is the recommended way to install the driver as AWS manages the lifecycle
aws eks create-addon \
  --cluster-name eks-nebulance \
  --addon-name aws-ebs-csi-driver \
  --service-account-role-arn arn:aws:iam::${AWS_ACCOUNT_ID}:role/AmazonEKS_EBS_CSI_DriverRole \
  --region eu-central-1

# Verify the add-on installation
aws eks describe-addon \
  --cluster-name eks-nebulance \
  --addon-name aws-ebs-csi-driver \
  --region eu-central-1

# Note: The IAM role 'AmazonEKS_EBS_CSI_DriverRole' should be created in advance with the
# required permissions. You can create it using the AWS Management Console or with the
# following eksctl command:

eksctl create iamserviceaccount \
  --name ebs-csi-controller-sa \
  --namespace kube-system \
  --cluster eks-nebulance \
  --role-name AmazonEKS_EBS_CSI_DriverRole \
  --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy \
  --approve
```

### 5. Create Storage Classes

```bash
# Create gp3 storage class
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
EOF
```

### 6. Set Up External Secrets Operator

```bash
# Set your AWS account ID as a variable
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)

# Download the IAM policy document for External Secrets Operator
# This policy allows access to AWS Secrets Manager
cat > iam_policy_external_secrets.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetResourcePolicy",
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecretVersionIds"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create IAM policy for External Secrets Operator
# This policy allows the operator to read secrets from AWS Secrets Manager
aws iam create-policy \
    --policy-name ExternalSecretsOperatorPolicy \
    --policy-document file://iam_policy_external_secrets.json

# Create OIDC provider for the cluster
# This enables IAM roles for service accounts (IRSA) in the cluster
eksctl utils associate-iam-oidc-provider \
    --region eu-central-1 \
    --cluster eks-nebulance \
    --approve

# Create IAM role for External Secrets
# This creates a service account with permissions to access AWS Secrets Manager
eksctl create iamserviceaccount \
  --name external-secrets-sa \
  --namespace nebulance \
  --cluster eks-nebulance \
  --attach-policy-arn arn:aws:iam::${AWS_ACCOUNT_ID}:policy/ExternalSecretsOperatorPolicy \
  --approve \
  --override-existing-serviceaccounts

# Install External Secrets Operator
# This deploys the operator that will sync AWS Secrets Manager secrets to Kubernetes secrets
helm repo add external-secrets https://charts.external-secrets.io
helm repo update
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true
```

### 7. Create Secrets in AWS Secrets Manager

```bash
#!/bin/bash

# Generate cryptographically secure secrets
JWT_SECRET=$(openssl rand -base64 32)
API_KEY=$(openssl rand -hex 16)
DB_PASSWORD=$(openssl rand -base64 20)

echo "Generated secrets:"
echo "JWT_SECRET: $JWT_SECRET"
echo "API_KEY: $API_KEY"
echo "DB_PASSWORD: $DB_PASSWORD"
echo ""

# Create database secrets
aws secretsmanager create-secret \
  --name "eks-app/database" \
  --description "Database credentials for EKS application" \
  --secret-string "{
    \"POSTGRES_USER\":\"appuser\",
    \"POSTGRES_PASSWORD\":\"$DB_PASSWORD\",
    \"POSTGRES_DB\":\"appdb\"
  }" \
  --region eu-central-1

# Create application secrets
aws secretsmanager create-secret \
  --name "eks-app/application" \
  --description "Application secrets for EKS application" \
  --secret-string "{
    \"JWT_SECRET\":\"$JWT_SECRET\",
    \"API_KEY\":\"$API_KEY\",
    \"NODE_ENV\":\"production\"
  }" \
  --region eu-central-1

echo "Secrets created in AWS Secrets Manager"
echo "Verifying secrets..."

# Verify secrets were created
aws secretsmanager list-secrets --region eu-central-1 --query 'SecretList[?contains(Name, `eks-app`)].{Name:Name,Description:Description}'
```

### 8. Build and Push Docker Images

```bash
# Build and push frontend image
cd frontend
docker build -t sheenandeh333/eks-app-frontend:1.0.0 .
docker push sheenandeh333/eks-app-frontend:1.0.0

# Build and push backend image
cd ../backend
docker build -t sheenandeh333/eks-app-backend:1.0.0 .
docker push sheenandeh333/eks-app-backend:1.0.0
```

### 9. Deploy with Helm

```bash
# Create namespace
kubectl create namespace nebulance

# Deploy the application
helm upgrade --install nebulance ./helm-charts \
  --namespace nebulance \
  --wait \
  --timeout 10m
```

### 10. Set Up CircleCI for CI/CD

1. Connect your GitHub repository to CircleCI
2. Add the following environment variables in CircleCI project settings:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username
   - `DOCKERHUB_PASSWORD`: Your Docker Hub password
   - `AWS_ACCESS_KEY_ID`: AWS access key with appropriate permissions
   - `AWS_SECRET_ACCESS_KEY`: AWS secret key
3. Push changes to the main branch to trigger the CI/CD pipeline

### 11. Access the Application

```bash
# Get the frontend LoadBalancer URL
kubectl get svc frontend -n nebulance

# The application will be available at the EXTERNAL-IP address on port 80
```

## Architecture

- **Frontend**: Nginx serving React.js application, exposed via LoadBalancer
- **Backend**: Node.js API, accessible within the cluster
- **Database**: PostgreSQL with persistent storage using EBS volumes

## Security Features

- RBAC enabled with least-privilege access
- All secrets managed through AWS Secrets Manager
- Security groups following minimal access principles
- Container images running as non-root users
- Network policies for pod-to-pod communication

## Troubleshooting

- Check pod status: `kubectl get pods -n nebulance`
- View pod logs: `kubectl logs <pod-name> -n nebulance`
- Check secrets: `kubectl get secrets -n nebulance`
- Verify external secrets: `kubectl get externalsecret -n nebulance`
- Check persistent volumes: `kubectl get pvc -n nebulance`

## Maintenance

- Update images by pushing new code to the main branch
- Scale the application by adjusting the `replicaCount` in values.yaml
- Monitor the application using CloudWatch or other monitoring tools