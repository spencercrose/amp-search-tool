// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand,
  } from "@aws-sdk/client-bedrock-agent-runtime";
import 'dotenv/config';
import { fromEnv } from "@aws-sdk/credential-providers";

/**
   * @typedef {Object} ResponseBody
   * @property {string} completion
   */
  
  /**
   * Invokes a Bedrock agent to run an inference using the input
   * provided in the request body.
   * - permission to invoke agent, found here https://ca-central-1.console.aws.amazon.com/systems-manager/parameters/%252Fiam_users%252Famp-chatbot_keys/description?region=ca-central-1&tab=Table#list_parameter_filters=Name:Contains:chatbot
   *
   * @param {string} prompt - The prompt that you want the Agent to complete.
   * @param {string} sessionId - An arbitrary identifier for the session.
   */
  export const invokeBedrockAgent = async (prompt, sessionId) => {
    const client = new BedrockAgentRuntimeClient({ 
      region: "ca-central-1",
      credentials: fromEnv(),
    });
    // const client = new BedrockAgentRuntimeClient({
    //   region: "ca-central-1",
    //   credentials: {
    //     accessKeyId: process.env['ACCESS_KEY_ID'], 
    //     secretAccessKey: process.env['SECRET_ACCESS_KEY']
    //   },
    // });
  
    const agentId = process.env['AGENT_ID'];
    const agentAliasId = process.env['AGENT_ALIAS_ID'];
  
    const command = new InvokeAgentCommand({
      agentId,
      agentAliasId,
      sessionId,
      inputText: prompt,
    });
  
    try {
      let completion = "";
      const response = await client.send(command);
  
      if (response.completion === undefined) {
        throw new Error("Completion is undefined");
      }
  
      for await (const chunkEvent of response.completion) {
        const chunk = chunkEvent.chunk;
        console.log(chunk);
        const decodedResponse = new TextDecoder("utf-8").decode(chunk.bytes);
        completion += decodedResponse;
      }
  
      return { sessionId: sessionId, completion };
    } catch (err) {
      console.error(err);
    }
  };
  
  // Call function if run directly
  import { fileURLToPath } from "node:url";
  if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const result = await invokeBedrockAgent("I need help.", "123");
    console.log(result);
  }