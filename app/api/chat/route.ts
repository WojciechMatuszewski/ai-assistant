import {
  appendChatMessages,
  getChatById,
  saveChat,
  updateChat,
  type DBChat
} from "@/app/persistance";
import { createAgent, generateTitleForChat } from "@/src/llm";
import type { MyUIMessage } from "@/src/types";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  safeValidateUIMessages
} from "ai";

export const POST = async (request: Request) => {
  const body: { message?: MyUIMessage; id?: string } = await request.json();

  let currentChat = await getChatById({ id: body.id });
  const currentChatMessages = currentChat?.messages ?? [];

  const maybeChatMessage = [...currentChatMessages, body.message];
  const validateUIMessagesResult = await safeValidateUIMessages<MyUIMessage>({
    messages: maybeChatMessage
  });

  if (!validateUIMessagesResult.success) {
    return Response.json({
      error: `Invalid messages: ${validateUIMessagesResult.error}`
    });
  }

  const chatMessages = validateUIMessagesResult.data;
  const modelMessages = await convertToModelMessages(chatMessages);

  const stream = createUIMessageStream<MyUIMessage>({
    async execute({ writer }) {
      const agent = createAgent();

      let generateChatTitlePromise: Promise<void> = Promise.resolve();

      if (!currentChat) {
        currentChat = {
          id: body.id ?? crypto.randomUUID(),
          title: "Generating...",
          messages: chatMessages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await saveChat({ chat: currentChat });

        writer.write({
          type: "data-frontend-chat",
          data: currentChat,
          transient: true
        });

        generateChatTitlePromise = generateTitleForChat({
          messages: chatMessages
        })
          .then((title) => {
            return updateChat({ id: currentChat!.id, updates: { title } });
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
        messages: modelMessages
      });

      writer.merge(
        agentStream.toUIMessageStream({
          sendSources: true,
          sendReasoning: true
        })
      );

      await generateChatTitlePromise;
    },
    onFinish: async ({ responseMessage }) => {
      await appendChatMessages({
        id: currentChat!.id,
        messages: [responseMessage]
      });
    }
  });

  return createUIMessageStreamResponse({
    stream
  });
};

export const maxDuration = 30;
