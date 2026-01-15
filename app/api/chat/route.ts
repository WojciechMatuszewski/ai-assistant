import {
  appendChatMessages,
  getChatById,
  saveChat,
  updateChat
} from "@/app/persistance";
import {
  createEmailAssistantAgent,
  generateTitleForChat,
  getTools
} from "@/src/llm";
import { logger } from "@/src/logger";
import type { MyUIMessage } from "@/src/types";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  safeValidateUIMessages
} from "ai";

export const POST = async (request: Request) => {
  const body: { message?: MyUIMessage; id?: string } = await request.json();

  const { chat: currentChat, isNewChat } = await getChat({ id: body.id });
  const currentChatMessages = currentChat.messages;

  const validateUIMessagesResult = await safeValidateUIMessages<MyUIMessage>({
    messages: [...currentChatMessages, body.message]
  });
  if (!validateUIMessagesResult.success) {
    return Response.json({
      error: `Invalid messages: ${validateUIMessagesResult.error}`
    });
  }

  const validatedChatMessages = validateUIMessagesResult.data;
  currentChat.messages = validatedChatMessages;

  const stream = createUIMessageStream<MyUIMessage>({
    async execute({ writer }) {
      const agent = createEmailAssistantAgent({ tools: getTools() });

      let generateChatTitlePromise: Promise<void> = Promise.resolve();

      if (isNewChat) {
        await saveChat({ chat: currentChat });

        writer.write({
          type: "data-frontend-chat",
          data: currentChat,
          transient: true
        });

        generateChatTitlePromise = generateTitleForChat({
          messages: validatedChatMessages
        })
          .then((title) => {
            return updateChat({ id: currentChat.id, updates: { title } });
          })
          .then((updatedChat) => {
            writer.write({
              type: "data-frontend-chat",
              data: updatedChat!,
              transient: true
            });
          });
      }

      const agentStream = await agent.stream({
        messages: await convertToModelMessages(validatedChatMessages)
      });

      writer.merge(
        agentStream.toUIMessageStream({
          sendSources: true,
          sendReasoning: true,
          onError(error) {
            logger.error({ error });
            return "An error occurred.";
          }
        })
      );

      await generateChatTitlePromise;
    },
    onFinish: async ({ responseMessage }) => {
      await appendChatMessages({
        id: currentChat.id,
        messages: [responseMessage]
      });
    }
  });

  return createUIMessageStreamResponse({
    stream
  });
};

export const maxDuration = 30;

async function getChat({ id }: { id: string | undefined }) {
  const retrieved = await getChatById({ id });
  if (retrieved) {
    return { isNewChat: false, chat: retrieved };
  }

  return {
    isNewChat: true,
    chat: {
      isNewChat: true,
      id: crypto.randomUUID(),
      title: "Generating...",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
}
