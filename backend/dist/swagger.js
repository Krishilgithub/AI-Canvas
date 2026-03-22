"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'AI SaaS API',
            version: '1.0.0',
            description: 'API documentation for the AI SaaS platform, handling social media posting and automated workflows.',
        },
        servers: [
            {
                url: 'http://localhost:4000/api/v1',
                description: 'Development Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Provide an active JWT here to authorize protected routes.',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    // Automatically scan all routes and controllers for JSDoc documentation
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
