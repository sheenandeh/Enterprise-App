# Project 3 Bootcamp: Cloud-Native Production Deployment

## Project Title: "Nebulance EKS - Enterprise Application Platform"

## Mission Brief
As a DevOps engineer, you must architect and deploy a production-ready 3-tier web application on Amazon EKS. This project simulates real-world enterprise deployment challenges requiring Infrastructure as Code, container orchestration, and secure secrets management.

## Application Overview
You are provided with a complete 3-tier application:
- **Frontend**: React.js with authentication and dashboard features
- **Backend**: Node.js REST API with PostgreSQL integration  
- **Database**: PostgreSQL with persistent storage requirements

## Core Engineering Tasks

### Task 1: Infrastructure Architecture (Terraform)
**Objective**: Design and provision EKS cluster infrastructure

**Technical Requirements**:
- EKS cluster named "eks-nebulance" in eu-central-1 region
- Production VPC with multi-AZ deployment (3 availability zones)
- Public subnets for load balancers, private subnets for worker nodes
- IAM roles with IRSA capability for External Secrets Operator
- Auto-scaling node groups with t3.medium instances (2-10 nodes)
- KMS encryption for cluster secrets

**Success Criteria**: 
- Cluster accessible via kubectl
- Proper security group configurations
- Cost-optimized instance allocation

### Task 2: Container Engineering
**Objective**: Containerize and publish application images

**Technical Requirements**:
- Build production-ready Docker images from provided application code
- Implement security best practices (non-root users, minimal base images)
- Configure health checks and proper startup sequences
- Tag images as version 1.0.0
- Push to your chosen container registry

**Success Criteria**:
- Images build without vulnerabilities
- Health checks respond correctly
- Registry access properly configured

### Task 3: Secrets Management Integration
**Objective**: Implement secure credential management

**Technical Requirements**:
- Generate cryptographically secure secrets:
  - JWT_SECRET (32+ character random string for authentication)
  - API_KEY (unique identifier for API access)
  - POSTGRES credentials (user, password, database name)
- Store secrets in AWS Secrets Manager with proper naming:
  - `eks-app/database` - Database credentials
  - `eks-app/application` - Application secrets
- Configure External Secrets Operator for Kubernetes integration

**Success Criteria**:
- Secrets properly stored in AWS Secrets Manager
- External Secrets Operator syncing successfully
- No hardcoded credentials in any configuration

### Task 4: Kubernetes Orchestration (Helm)
**Objective**: Deploy application using Helm charts

**Technical Requirements**:
- Create Helm charts for all three application tiers
- Configure External Secrets integration for credential injection
- Implement PostgreSQL with persistent volume claims
- Set up horizontal pod autoscaling for frontend (2-5) and backend (3-10)
- Configure proper service discovery between tiers
- Implement readiness and liveness probes

**Success Criteria**:
- All pods running in healthy state
- Inter-service communication functional
- Database persistence across pod restarts
- Secrets properly mounted as environment variables

### Task 5: Load Balancing and External Access
**Objective**: Configure external application access via LoadBalancer services

**Technical Requirements**:
- Configure frontend and backend services as LoadBalancer type
- Implement AWS Network Load Balancer annotations for optimal performance
- Set up separate external endpoints for frontend (port 80) and backend API (port 3000)
- Configure security groups to allow external traffic on required ports
- Implement proper health check endpoints for load balancer targets

**Success Criteria**:
- Frontend accessible via external LoadBalancer URL on port 80
- Backend API accessible via external LoadBalancer URL on port 3000
- LoadBalancer health checks passing for both services
- Auto-scaling and high availability maintained

## Technical Specifications

### Cluster Configuration
- **Kubernetes Version**: 1.28+
- **Region**: eu-central-1 (Frankfurt)
- **Node Instance Type**: t3.medium
- **Networking**: IPv4 with private API endpoint access

### Security Requirements
- RBAC enabled with least-privilege access
- All secrets managed through AWS Secrets Manager
- Security groups following minimal access principles
- Container images running as non-root users
- Network policies for pod-to-pod communication

### High Availability Design
- Multi-AZ deployment across 3 availability zones
- Auto-scaling groups for worker nodes
- Persistent storage for database tier
- Load balancer with health check failover

## Evaluation Criteria

### Infrastructure Excellence (35%)
- Terraform code quality and organization
- Security group and IAM configuration
- VPC design following AWS best practices
- Proper resource tagging and naming conventions

### Application Deployment (35%)
- Helm chart structure and parameterization
- Pod health and resource allocation
- Service discovery and communication
- External Secrets integration functionality

### Security Implementation (20%)
- Secrets management best practices
- No credential exposure in code or logs
- Proper RBAC and service account configuration
- Container security practices

### Professional Delivery (10%)
- Clear documentation with evidence
- Working application demonstration
- Architecture understanding and explanation

## Submission Deliverables

### Required Evidence
1. **Infrastructure Proof**
   - EKS cluster operational in AWS console
   - kubectl access demonstration
   - Resource deployment summary

2. **Application Evidence** 
   - All pods in Running status
   - External Secrets sync confirmation
   - Container registry with published images

3. **Functional Verification**
   - Public application URL with working authentication
   - API endpoints responding correctly
   - Database persistence demonstration

4. **Professional Documentation**
   - Architecture overview
   - Registry URLs and image tags
   - Any custom configurations implemented

## Success Metrics
- **Infrastructure**: 100% resource provisioning success
- **Security**: Zero hardcoded credentials, all secrets via AWS Secrets Manager
- **Functionality**: Complete user registration and login workflow
- **Performance**: Application response time <2 seconds
- **Cost**: Infrastructure cost <$50/month for test deployment

## Timeline Recommendation
- **Day 1**: Terraform infrastructure deployment
- **Day 2**: Container builds and secrets configuration  
- **Day 3**: Helm charts and application deployment
- **Day 4**: Load balancer setup and final verification

## Key Challenges to Expect
- IRSA configuration for External Secrets Operator
- Network Load Balancer setup with proper AWS integration
- Container registry authentication in Kubernetes
- Database persistent volume configuration
- Security group rules for LoadBalancer external access

Remember: This project tests production-level DevOps engineering skills. Focus on security, scalability, and operational best practices throughout your implementation.