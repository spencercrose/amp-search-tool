/**
 * @file index.js
 * @description Express server for OpenAI API
 */

const express = require('express');
const OpenAI = require('openai');

const app = express();
const port = 4000;

// Middleware to parse JSON payload
app.use(express.json());

// API endpoint to send text to OpenAI
app.post('/openai', async (req, res) => {
  const { prompt } = req.body;

  // Validate text payload
  if (!prompt) {
    return res.status(400).send({ error: 'Prompt is required' });
  }

  try {

    // OpenAI API settings
    const client = new OpenAI({
      apiKey: process.env['OPENAI_API_KEY'],
    });

    const response = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-3.5-turbo',
    });

    console.log(response)

    // Return OpenAI response
    res.send(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to connect to external API' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});