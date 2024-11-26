// Modified from the original Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
// Reference:
// https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html#API_agent-runtime_RetrieveAndGenerate_Examples
// User Guide: 
// https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html

/**
 * @file agent.js
 * @description AWS Bedrock API
 * 
 * Request Body

The request accepts the following data in JSON format.

input
  Contains the query to be made to the knowledge base.
  Type: RetrieveAndGenerateInput object
  Required: Yes

retrieveAndGenerateConfiguration
  Contains configurations for the knowledge base query and retrieval process. For more information, see Query configurations.
  Type: RetrieveAndGenerateConfiguration object
  Required: No

sessionConfiguration
  Contains details about the session with the knowledge base.
  Type: RetrieveAndGenerateSessionConfiguration object
  Required: No

sessionId
  The unique identifier of the session. When you first make a RetrieveAndGenerate request, Amazon Bedrock automatically generates this value. You must reuse this value for all subsequent requests in the same conversational session. This value allows Amazon Bedrock to maintain context and knowledge from previous interactions. You can't explicitly set the sessionId yourself.
  Type: String
  Length Constraints: Minimum length of 2. Maximum length of 100.
  Pattern: ^[0-9a-zA-Z._:-]+$
  Required: No

 * */

import { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";  

import 'dotenv/config';
import { fromEnv } from "@aws-sdk/credential-providers";

const NUMBER_OF_RESULTS = 5;
const OVERRIDE_SEARCH_TYPE = "HYBRID";
const MODEL_TYPE="KNOWLEDGE_BASE";

/**
 * Parses an S3 URI string into an object containing the bucket name and key.
 * 
 * @param {string} s3Uri - The S3 URI string to parse (e.g., 's3://bucket/key').
 * 
 * @throws {Error} If the input is not a string or if the URI format is invalid.
 * 
 * @returns {Object} An object with 'bucket' and 'key' properties extracted from the URI.
 */
function parseS3Uri(s3Uri) {
  if (typeof s3Uri !== 'string') {
    throw new Error(`Input must be a string: ${s3Uri}`);
  }

  const match = s3Uri.match(/^s3:\/\/([^\/]+)\/(.*)$/);
  if (match) {
    const bucket = match[1];
    const key = match[2];
    if (!bucket || !key) {
      throw new Error(`Invalid S3 URI: ${s3Uri}`);
    }
    return {
      bucket,
      key,
    };
  } else {
    throw new Error(`Invalid S3 URI: ${s3Uri}`);
  }
}

const generationConfiguration = {
  // promptTemplate: {
  //   textPromptTemplate: "Please generate a summary based on the search results: $search_results$"
  // },
  // guardrailConfiguration: {
  //   guardrailId: "my-guardrail",
  //   guardrailVersion: "1.0.0"
  // },
  inferenceConfig: {
    textInferenceConfig: {
      temperature: 0,
      topP: 1.0,
      topK: 250,
      maxTokens: 2048,
      // stopSequences: ["\n\n"]
    }
  }
};

const orchestrationConfiguration = {
  // promptTemplate: {
  //   textPromptTemplate: "Please generate a response based on the conversation history: $conversation_history$ and output format instructions: $output_format_instructions$",
  // },
  inferenceConfig: {
    textInferenceConfig: {
      temperature: 0,
      topP: 1.0,
      topK: 250,
      maxTokens: 2048,
      // stopSequences: ["\n\n"]
    }
  },
  // queryTransformationConfiguration: {
  //   type: "QUERY_DECOMPOSITION"
  // }
};

/**
   * @typedef {Object} ResponseBody
   * @property {string} completion
   */
  
  /**
   * Invokes a Bedrock retrieval and generation agent to run an inference using the input
   * provided in the request body.
   *
   * @param {string} prompt - The prompt that you want the Agent to complete.
   * @param {string} sessionId - An arbitrary identifier for the session.
   */
  export const invokeBedrockRetrieval = async (prompt, sessionId) => {

    // create a Bedrock runtime client
    const client = new BedrockAgentRuntimeClient({ 
      region: "ca-central-1",
      credentials: fromEnv(),
    });  

    // create a s3 client
    const s3Client = new S3Client({
      region: "ca-central-1",
      credentials: fromEnv(),
    });

  /**
   * Takes a citation object and returns a new object with the same metadata, but
   * with each of the retrieved references replaced with an object containing the
   * same fields as the original reference, plus a 'signedUrl' field containing a
   * presigned URL that can be used to retrieve the referenced document for up to
   * 1 hour.
   * 
   * @param {Object} citation - The citation object to parse. Must have a 'metadata'
   *     property and a 'retrievedReferences' property, which is an array of objects
   *     with 'location' properties containing an 's3Location' object with a 'uri'
   *     property.
   * 
   * @returns {Promise<Object>} A promise that resolves to an object with the same
   *     metadata as the input, but with each of the retrieved references replaced
   *     with an object containing the same fields as the original reference, plus a
   *     'signedUrl' field containing a presigned URL that can be used to retrieve
   *     the referenced document for up to 1 hour.
   */
    const parseCitation = async (citation) => {
      const metadata = citation?.metadata;
      const retrievedReferences = await Promise.all(citation.retrievedReferences.map( async(reference) => {
        const { bucket, key } = parseS3Uri(reference.location.s3Location.uri);
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        });
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return { ...reference, signedUrl };
      }));
      return {
        metadata,
        retrievedReferences,
      };
  }
  
    const input = { // RetrieveAndGenerateRequest
      input: { // RetrieveAndGenerateInput
        text: prompt, // required
      },
      retrieveAndGenerateConfiguration: { // RetrieveAndGenerateConfiguration
        type: MODEL_TYPE, // required
        knowledgeBaseConfiguration: { // KnowledgeBaseRetrieveAndGenerateConfiguration
          knowledgeBaseId: process.env['KNOWLEDGE_BASE_ID'], // required
          modelArn: process.env['MODEL_ARN'], // required
          retrievalConfiguration: { // KnowledgeBaseRetrievalConfiguration
            vectorSearchConfiguration: { // KnowledgeBaseVectorSearchConfiguration
              numberOfResults: NUMBER_OF_RESULTS,
              overrideSearchType: OVERRIDE_SEARCH_TYPE,
            //   filter: { // RetrievalFilter Union: only one key present
            //     equals: { // FilterAttribute
            //       key: "STRING_VALUE", // required
            //       value: "DOCUMENT_VALUE", // required
            //     },
            //     notEquals: {
            //       key: "STRING_VALUE", // required
            //       value: "DOCUMENT_VALUE", // required
            //     },
            //     greaterThan: {
            //       key: "STRING_VALUE", // required
            //       value: "DOCUMENT_VALUE", // required
            //     },
            //     greaterThanOrEquals: {
            //       key: "STRING_VALUE", // required
            //       value: "DOCUMENT_VALUE", // required
            //     },
            //     lessThan: {
            //       key: "STRING_VALUE", // required
            //       value: "DOCUMENT_VALUE", // required
            //     },
            //     lessThanOrEquals: "<FilterAttribute>",
            //     in: "<FilterAttribute>",
            //     notIn: "<FilterAttribute>",
            //     startsWith: "<FilterAttribute>",
            //     listContains: "<FilterAttribute>",
            //     stringContains: "<FilterAttribute>",
            //     andAll: [ // RetrievalFilterList
            //       {//  Union: only one key present
            //         equals: "<FilterAttribute>",
            //         notEquals: "<FilterAttribute>",
            //         greaterThan: "<FilterAttribute>",
            //         greaterThanOrEquals: "<FilterAttribute>",
            //         lessThan: "<FilterAttribute>",
            //         lessThanOrEquals: "<FilterAttribute>",
            //         in: "<FilterAttribute>",
            //         notIn: "<FilterAttribute>",
            //         startsWith: "<FilterAttribute>",
            //         listContains: "<FilterAttribute>",
            //         stringContains: "<FilterAttribute>",
            //         andAll: [
            //           "<RetrievalFilter>",
            //         ],
            //         orAll: [
            //           "<RetrievalFilter>",
            //         ],
            //       },
            //     ],
            //     orAll: [
            //       "<RetrievalFilter>",
            //     ],
            //   }, 
            },
          },
          generationConfiguration: generationConfiguration,
          orchestrationConfiguration: orchestrationConfiguration,
        },
        // externalSourcesConfiguration: { // ExternalSourcesRetrieveAndGenerateConfiguration
        //   modelArn: "STRING_VALUE", // required
        //   sources: [ // ExternalSources // required
        //     { // ExternalSource
        //       sourceType: "S3" || "BYTE_CONTENT", // required
        //       s3Location: { // S3ObjectDoc
        //         uri: "STRING_VALUE", // required
        //       },
        //       byteContent: { // ByteContentDoc
        //         identifier: "STRING_VALUE", // required
        //         contentType: "STRING_VALUE", // required
        //         data: new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")             // required
        //       },
        //     },
        //   ],
        //   generationConfiguration: { // ExternalSourcesGenerationConfiguration
        //     promptTemplate: {
        //       textPromptTemplate: "STRING_VALUE",
        //     },
        //     guardrailConfiguration: {
        //       guardrailId: "STRING_VALUE", // required
        //       guardrailVersion: "STRING_VALUE", // required
        //     },
        //     inferenceConfig: {
        //       textInferenceConfig: {
        //         temperature: Number("float"),
        //         topP: Number("float"),
        //         maxTokens: Number("int"),
        //         stopSequences: [
        //           "STRING_VALUE",
        //         ],
        //       },
        //     },
        //     additionalModelRequestFields: {
        //       "<keys>": "DOCUMENT_VALUE",
        //     },
        //   },
        // },
      },
      // sessionConfiguration: { // RetrieveAndGenerateSessionConfiguration
      //   kmsKeyArn: process.env['KMS_KEY_ARN'], // required
      // },
    };

    // Add sessionId if provided
    if (sessionId) {
      input.sessionId = sessionId;
    }
  
    try {
      const command = new RetrieveAndGenerateCommand(input);
      const response = await client.send(command);

      const result = {
        sessionId: response?.sessionId,
        response: {
          output: {
            text: response?.output?.text,
          },
          citations: await Promise.all(response?.citations?.map( async (citation) => {
            return await parseCitation(citation)
          })),
          guardrailAction: response?.guardrailAction,
        },
      };

      // Return the result
      return { sessionId: sessionId, response: result };

    } catch (error) {
      if (error.name === 'ServiceException') {
        // Handle AWS Bedrock API errors
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error(`AWS Bedrock API error: ${errorCode} - ${errorMessage}`);
        // You can also throw a custom error or return a error response
        throw new Error(`AWS Bedrock API error: ${errorCode} - ${errorMessage}`);
      } else {
        // Handle other errors
        console.error('Error invoking AWS Bedrock retrieval:', error);
        throw error;
      }
    }
  };