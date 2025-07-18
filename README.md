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
git clone https://github.com/yourusername/nebulance-eks.git
cd nebulance-eks/terraform

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
# Create IAM policy for AWS Load Balancer Controller
aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam_policy_lb.json

# Create service account
eksctl create iamserviceaccount \
  --cluster=eks-nebulance \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
  --override-existing-serviceaccounts \
  --approve

# Install AWS Load Balancer Controller using Helm
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=eks-nebulance \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

### 4. Install EBS CSI Driver

```bash
# Create IAM policy for EBS CSI Driver
aws iam create-policy \
    --policy-name AmazonEBSCSIDriverPolicy \
    --policy-document file://iam_policy_ebs_csi.json

# Create service account
eksctl create iamserviceaccount \
  --name ebs-csi-controller-sa \
  --namespace kube-system \
  --cluster eks-nebulance \
  --attach-policy-arn arn:aws:iam::ACCOUNT_ID:policy/AmazonEBSCSIDriverPolicy \
  --approve \
  --override-existing-serviceaccounts

# Install EBS CSI Driver
helm repo add aws-ebs-csi-driver https://kubernetes-sigs.github.io/aws-ebs-csi-driver
helm repo update
helm install aws-ebs-csi-driver aws-ebs-csi-driver/aws-ebs-csi-driver \
  --namespace kube-system \
  --set controller.serviceAccount.create=false \
  --set controller.serviceAccount.name=ebs-csi-controller-sa
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
# Create IAM policy for External Secrets Operator
aws iam create-policy \
    --policy-name ExternalSecretsOperatorPolicy \
    --policy-document file://iam_policy_external_secrets.json

# Create OIDC provider for the cluster
eksctl utils associate-iam-oidc-provider \
    --region eu-central-1 \
    --cluster eks-nebulance \
    --approve

# Create IAM role for External Secrets
eksctl create iamserviceaccount \
  --name external-secrets-sa \
  --namespace nebulance \
  --cluster eks-nebulance \
  --attach-policy-arn arn:aws:iam::ACCOUNT_ID:policy/ExternalSecretsOperatorPolicy \
  --approve \
  --override-existing-serviceaccounts

# Install External Secrets Operator
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