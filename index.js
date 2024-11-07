/**
 * @file index.js
 * @description Express server for AWS Bedrock API
 */

import express from 'express';
import crypto from 'crypto';
import {invokeBedrockAgent} from './agent.js';

const app = express();
const port = 4000;

// Middleware to parse JSON payload
app.use(express.json());

// API endpoint to send text to OpenAI
app.post('/query', async (req, res) => {
  const { prompt } = req.body;

  // Validate text payload
  if (!prompt) {
    return res.status(400).send({ error: 'Prompt is required' });
  }

  try {
    // generate a unique session ID
    const uuid = crypto.randomBytes(16).toString('hex');
    // Call the AWS Bedrock API
    const response = await invokeBedrockAgent(prompt, uuid);

    console.log(response)

    // Return the response
    res.send(response.completion);

  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to connect to external API' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});