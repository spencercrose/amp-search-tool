/**
 * @file index.js
 * @description Express server for AWS Bedrock API
 */

import express from 'express';
import crypto from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { invokeBedrockAgent } from './agent.js';
import { invokeBedrockRetrieval } from './retrieval.js';
import { sanitize, sanitizeSessionID } from './utils.js';
import 'dotenv/config';

const app = express();
const port = 4000;

// Allow CORS requests from the specified CLIENT_HOST
const corsOptions = {
  origin: process.env.CLIENT_HOST,
};

app.use(cors(corsOptions));

// Set up Helmet for security
// app.use(helmet());

// Set up Morgan for logging
const loggingFormat = ':method :url :status :res[content-length] - :response-time ms';
app.use(morgan(loggingFormat));

// Middleware to parse JSON payload
app.use(express.json());

// API endpoint for AWS Bedrock agent
app.post('/agent', async (req, res) => {
  const { message } = req.body;
  // DEBUG: 
  console.log(message);

  // Validate text payload
  if (!message) {
    return res.status(400).send({ error: 'Prompt is required' });
  }

  try {
    // generate a unique session ID
    const uuid = crypto.randomBytes(16).toString('hex');
    // Call the AWS Bedrock API
    const sanitizedPrompt = sanitize(message);
    const response = await invokeBedrockAgent(sanitizedPrompt, uuid);

    // Return the response
    res.send(response.completion);

  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to connect to external API' });
  }
});

// API endpoint for AWS Bedrock retrieval and generation
app.post('/retrieve', async (req, res) => {
  const { message, session_id } = req.body;
  // DEBUG: 
  console.log('Prompt:', message);

  // Validate text payload
  if (!message) {
    return res.status(400).send({ error: 'Prompt is required' });
  }

  try {
    // Call the AWS Bedrock API
    const sanitizedPrompt = sanitize(message);
    const sanitizedSessionId = sanitizeSessionID(session_id);
    const response = await invokeBedrockRetrieval(sanitizedPrompt, sanitizedSessionId);

    // Return the response
    res.json(response);

  } catch (error) {
    res.status(error?.code || 500).json(error?.message);
  }
});

// API endpoint for readiness check
app.get('/health', async (_, res) => {
  res.status(200).send({ status: 'OK' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send({ error: 'Internal Server Error' });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).send({ error: 'Not Found' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});