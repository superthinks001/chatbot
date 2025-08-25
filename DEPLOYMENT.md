# 🚀 Aldeia Advisor Deployment Guide

## Production Deployment

### 1. Environment Setup

#### Backend Environment Variables
```bash
# .env
NODE_ENV=production
PORT=4000
FRONTEND_ORIGIN=https://yourdomain.com
CHROMA_HOST=your-chroma-host
CHROMA_PORT=8000
```

#### Frontend Environment Variables
```bash
# .env
REACT_APP_API_URL=https://your-backend-url.com/api
REACT_APP_SEARCH_URL=https://your-backend-url.com/api/chat/search
```

### 2. Docker Production Build

```bash
# Build production images
docker build -t aldeia-backend ./backend
docker build -t aldeia-frontend ./frontend

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Cloud Deployment Options

#### Option A: AWS ECS
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    image: aldeia-backend:latest
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
  
  frontend:
    image: aldeia-frontend:latest
    ports:
      - "80:80"
    depends_on:
      - backend
```

#### Option B: Google Cloud Run
```bash
# Deploy backend
gcloud run deploy aldeia-backend \
  --image gcr.io/your-project/aldeia-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# Deploy frontend
gcloud run deploy aldeia-frontend \
  --image gcr.io/your-project/aldeia-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## 💰 Monetization Implementation

### 1. SaaS Platform Setup

#### Multi-tenant Architecture
```typescript
// backend/src/middleware/tenant.ts
interface Tenant {
  id: string;
  name: string;
  domain: string;
  apiKey: string;
  plan: 'basic' | 'premium' | 'enterprise';
  features: string[];
  rateLimit: number;
}

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const tenant = getTenantByApiKey(apiKey);
  
  if (!tenant) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  req.tenant = tenant;
  next();
};
```

#### Usage Tracking
```typescript
// backend/src/services/analytics.ts
export class UsageTracker {
  async trackRequest(tenantId: string, endpoint: string, responseTime: number) {
    await this.db.collection('usage').insertOne({
      tenantId,
      endpoint,
      responseTime,
      timestamp: new Date(),
      cost: this.calculateCost(endpoint, responseTime)
    });
  }
  
  async getMonthlyUsage(tenantId: string): Promise<UsageReport> {
    // Implementation for usage reporting
  }
}
```

### 2. Pricing Tiers

#### Basic Plan ($99/month)
- 1,000 API calls/month
- Basic document search
- Standard support
- Basic analytics

#### Premium Plan ($299/month)
- 10,000 API calls/month
- Advanced NLP features
- Custom document ingestion
- Priority support
- Advanced analytics dashboard

#### Enterprise Plan ($999/month)
- Unlimited API calls
- White-label solution
- Custom integrations
- Dedicated support
- Full analytics suite
- Compliance reporting

### 3. Payment Integration

#### Stripe Integration
```typescript
// backend/src/services/billing.ts
import Stripe from 'stripe';

export class BillingService {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  
  async createSubscription(tenantId: string, planId: string) {
    const subscription = await this.stripe.subscriptions.create({
      customer: tenantId,
      items: [{ price: planId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
    
    return subscription;
  }
  
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailure(event.data.object);
        break;
    }
  }
}
```

### 4. Analytics & Insights

#### Data Collection
```typescript
// backend/src/services/insights.ts
export class InsightsService {
  async collectQueryData(tenantId: string, query: string, response: any) {
    await this.db.collection('query_insights').insertOne({
      tenantId,
      query,
      intent: response.intent,
      confidence: response.confidence,
      timestamp: new Date(),
      anonymized: true
    });
  }
  
  async generateInsightsReport(tenantId: string): Promise<InsightsReport> {
    // Generate comprehensive insights
    const queries = await this.db.collection('query_insights')
      .find({ tenantId })
      .toArray();
    
    return {
      totalQueries: queries.length,
      topIntents: this.analyzeIntents(queries),
      confidenceDistribution: this.analyzeConfidence(queries),
      responseTimeStats: await this.getResponseTimeStats(tenantId)
    };
  }
}
```

## 🔧 Scaling Strategy

### 1. Horizontal Scaling

#### Load Balancer Configuration
```nginx
# nginx.conf
upstream aldeia_backend {
    least_conn;
    server backend1:4000;
    server backend2:4000;
    server backend3:4000;
}

server {
    listen 80;
    server_name api.aldeia-advisor.com;
    
    location / {
        proxy_pass http://aldeia_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. Database Scaling

#### ChromaDB Cluster
```yaml
# chromadb-cluster.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: chromadb
spec:
  serviceName: chromadb
  replicas: 3
  selector:
    matchLabels:
      app: chromadb
  template:
    metadata:
      labels:
        app: chromadb
    spec:
      containers:
      - name: chromadb
        image: chromadb/chroma:latest
        ports:
        - containerPort: 8000
        volumeMounts:
        - name: chromadb-data
          mountPath: /chroma/chroma
  volumeClaimTemplates:
  - metadata:
      name: chromadb-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

### 3. Caching Strategy

#### Redis Cache
```typescript
// backend/src/services/cache.ts
import Redis from 'ioredis';

export class CacheService {
  private redis = new Redis(process.env.REDIS_URL!);
  
  async getCachedResponse(query: string, tenantId: string): Promise<any> {
    const key = `response:${tenantId}:${this.hashQuery(query)}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async cacheResponse(query: string, tenantId: string, response: any, ttl: number = 3600) {
    const key = `response:${tenantId}:${this.hashQuery(query)}`;
    await this.redis.setex(key, ttl, JSON.stringify(response));
  }
}
```

## 📊 Monitoring & Analytics

### 1. Application Monitoring

#### Prometheus Metrics
```typescript
// backend/src/middleware/metrics.ts
import prometheus from 'prom-client';

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);
  });
  
  next();
};
```

### 2. Business Intelligence

#### Dashboard Setup
```typescript
// backend/src/routes/analytics.ts
router.get('/dashboard/:tenantId', async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  
  const dashboard = {
    usage: await usageService.getMonthlyUsage(tenantId),
    performance: await performanceService.getMetrics(tenantId),
    insights: await insightsService.generateInsightsReport(tenantId),
    revenue: await billingService.getRevenueMetrics(tenantId)
  };
  
  res.json(dashboard);
});
```

## 🔒 Security & Compliance

### 1. API Security

#### Rate Limiting
```typescript
// backend/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const createRateLimiter = (tenant: Tenant) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: tenant.rateLimit, // limit each IP to requests per windowMs
    message: {
      error: 'Rate limit exceeded',
      limit: tenant.rateLimit,
      resetTime: new Date(Date.now() + 15 * 60 * 1000)
    }
  });
};
```

### 2. Data Privacy

#### GDPR Compliance
```typescript
// backend/src/services/privacy.ts
export class PrivacyService {
  async anonymizeUserData(userId: string) {
    // Implementation for data anonymization
  }
  
  async exportUserData(userId: string) {
    // Implementation for data export
  }
  
  async deleteUserData(userId: string) {
    // Implementation for data deletion
  }
}
```

## 🚀 Go-to-Market Strategy

### 1. Target Markets

#### Primary: Government Agencies
- **LA County Success Story**: Use as case study
- **FEMA Partnership**: Federal disaster response
- **State Agencies**: California, Texas, Florida
- **Local Governments**: Cities and counties

#### Secondary: Private Sector
- **Insurance Companies**: Claims processing assistance
- **Construction Firms**: Permit and regulation guidance
- **Real Estate**: Property recovery information
- **Non-profits**: Disaster relief organizations

### 2. Marketing Channels

#### Digital Marketing
- **Content Marketing**: Blog posts about disaster recovery
- **SEO**: Target keywords like "fire recovery assistance"
- **Social Media**: LinkedIn for B2B, Twitter for updates
- **Webinars**: Educational sessions on disaster recovery

#### Sales Strategy
- **Direct Sales**: Government procurement cycles
- **Partnerships**: Technology integrators
- **Referrals**: Success story testimonials
- **Trade Shows**: Emergency management conferences

### 3. Success Metrics

#### Revenue Metrics
- **Monthly Recurring Revenue (MRR)**
- **Annual Recurring Revenue (ARR)**
- **Customer Acquisition Cost (CAC)**
- **Lifetime Value (LTV)**

#### Product Metrics
- **API Usage**: Calls per tenant
- **User Satisfaction**: NPS scores
- **Feature Adoption**: Advanced feature usage
- **Retention Rate**: Monthly/quarterly retention

---

**Ready to scale Aldeia Advisor to help communities worldwide! 🌍** 