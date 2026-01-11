import { createAgent } from "@/src/llm";
import type { MyUIMessage } from "@/src/types";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  safeValidateUIMessages
} from "ai";

export const POST = async (request: Request) => {
  const payload = await request.json();

  const validateUIMessagesResult = await safeValidateUIMessages<MyUIMessage>({
    messages: payload.messages
  });
  if (!validateUIMessagesResult.success) {
    return Response.json({
      error: `Invalid messages: ${validateUIMessagesResult.error}`
    });
  }

  const messages = validateUIMessagesResult.data;
  const modelMessages = await convertToModelMessages(messages);

  const stream = createUIMessageStream<MyUIMessage>({
    async execute({ writer }) {
      const agent = createAgent();

      const agentStream = await agent.stream({
        messages: modelMessages
      });

      writer.merge(
        agentStream.toUIMessageStream({
          sendSources: true,
          sendReasoning: true
        })
      );
    }
  });

  return createUIMessageStreamResponse({
    stream
  });
};

export const maxDuration = 30;
