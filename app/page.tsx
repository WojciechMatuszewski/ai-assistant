"use client";

import {
  ChatTitle,
  Form,
  MessagesList,
  ScrollToBottomIndicator,
  Sidebar
} from "@/app/components";
import type { MyUIMessage } from "@/src/types";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";

const MOCK_CHATS = [
  { id: "1", title: "Project Setup Help" },
  { id: "2", title: "React Hooks Discussion" },
  { id: "3", title: "TypeScript Best Practices" },
  { id: "4", title: "API Design Questions" },
  { id: "5", title: "Debugging Session" }
];

export default function Home() {
  const [selectedChatId, setSelectedChatId] = useState(MOCK_CHATS[0].id);
  const selectedChat = MOCK_CHATS.find((c) => c.id === selectedChatId);

  const { messages, sendMessage } = useChat<MyUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat"
    })
  });

  const { state, scrollRef, contentRef, scrollToBottom } = useStickToBottom({});
  const scrollToBottomButtonVisible = state.isAtBottom === false;

  return (
    <div className="drawer lg:drawer-open h-full">
      <input id="chat-sidebar" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col h-full">
        <ChatTitle
          title={selectedChat?.title ?? "New Chat"}
          sidebarToggleId="chat-sidebar"
        />

        <main className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto" id="scroller" ref={scrollRef}>
            <MessagesList ref={contentRef} messages={messages} />
          </div>

          <ScrollToBottomIndicator.Anchor className="mb-2" />

          <Form
            onSubmit={(value) => {
              sendMessage({ text: value });
              scrollToBottom();
            }}
          />

          <ScrollToBottomIndicator
            visible={scrollToBottomButtonVisible}
            onScrollToBottom={() => {
              scrollToBottom();
            }}
          />
        </main>
      </div>

      <Sidebar
        chats={MOCK_CHATS}
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        sidebarToggleId="chat-sidebar"
      />
    </div>
  );
}
