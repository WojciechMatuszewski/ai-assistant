"use server";

import { Chat, ChatTitle, Sidebar } from "@/app/components";
import { getAllChats, getChatById } from "@/app/persistance";

export default async function Home({
  searchParams
}: {
  searchParams: Promise<{ chatId?: string }>;
}) {
  const { chatId: chatIdFromSearchParams } = await searchParams;

  const [chat, chats] = await Promise.all([
    getCurrentChat({ chatIdFromSearchParams }),
    getAllChats()
  ]);

  return (
    <main className="drawer lg:drawer-open h-full">
      <input id="chat-sidebar" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col h-full">
        <ChatTitle
          title={chat?.title ?? "New Chat"}
          sidebarToggleId="chat-sidebar"
        />

        <Chat chat={chat} />
      </div>

      <Sidebar
        chats={chats}
        selectedChatId={chat?.id}
        sidebarToggleId="chat-sidebar"
      />
    </main>
  );
}

async function getCurrentChat({
  chatIdFromSearchParams
}: {
  chatIdFromSearchParams?: string;
}) {
  if (!chatIdFromSearchParams) {
    return null;
  }

  return await getChatById({ id: chatIdFromSearchParams });
}
