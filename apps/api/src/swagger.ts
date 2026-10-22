export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'AgriCloud REST API',
    version: '1.0.0',
    description:
      'Cloud-Connected Precision Agriculture, Environmental Monitoring, and Smart Irrigation REST API.\n\nAll protected endpoints require a Bearer JWT token in the Authorization header.',
    contact: {
      name: 'AgriCloud Engineering Team',
      email: 'support@agricloud.io',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Root',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Detailed error explanation' },
              code: { type: 'string', example: 'VALIDATION_ERROR' },
            },
          },
          requestId: { type: 'string', example: 'req_k8s92f1' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'System health check',
        security: [],
        responses: {
          200: { description: 'System is healthy' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate user with email and password',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'farmer@agricloud.io' },
                  password: { type: 'string', example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authentication successful with tokens' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current user profile',
        responses: {
          200: { description: 'User profile retrieved' },
        },
      },
    },
    '/farms': {
      get: {
        summary: 'List authorized farms',
        responses: { 200: { description: 'Array of farms' } },
      },
      post: {
        summary: 'Create a new farm',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'location', 'area', 'soilType'],
                properties: {
                  name: { type: 'string', example: 'Sunrise Valley' },
                  location: { type: 'string', example: 'Fresno, CA' },
                  area: { type: 'number', example: 50.0 },
                  soilType: { type: 'string', example: 'Loamy' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Farm created' } },
      },
    },
    '/readings/latest': {
      get: {
        summary: 'Retrieve latest environmental sensor readings across all fields',
        responses: { 200: { description: 'Current field and sensor states' } },
      },
    },
    '/readings/history': {
      get: {
        summary: 'Time-series sensor telemetry query',
        parameters: [
          { name: 'range', in: 'query', schema: { type: 'string', enum: ['1h', '6h', '24h', '7d', '30d'] } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'fieldId', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Historical data points' } },
      },
    },
    '/fields/{fieldId}/irrigation/start': {
      post: {
        summary: 'Start manual irrigation pump on a field',
        parameters: [{ name: 'fieldId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: { description: 'Pump activated' } },
      },
    },
    '/fields/{fieldId}/irrigation/stop': {
      post: {
        summary: 'Stop irrigation pump on a field',
        parameters: [{ name: 'fieldId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Pump stopped with water tally' } },
      },
    },
    '/alerts': {
      get: {
        summary: 'List system alerts and threshold violations',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'] } },
        ],
        responses: { 200: { description: 'Alert list' } },
      },
    },
    '/analytics/overview': {
      get: {
        summary: 'High-level telemetry and resource dashboard metrics',
        responses: { 200: { description: 'Aggregated stats' } },
      },
    },
    '/analytics/export/csv': {
      get: {
        summary: 'Download telemetry and irrigation events in CSV format',
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['readings', 'irrigation', 'alerts'] } },
        ],
        responses: { 200: { description: 'CSV file download' } },
      },
    },
  },
};
