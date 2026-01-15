"use client";

import type { MyUIMessage } from "@/src/types";
import { DefaultChatTransport, getToolName, type TextUIPart } from "ai";
import clsx from "clsx";
import {
  Fragment,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  type ComponentRef,
  type Ref
} from "react";
import z from "zod";

export function Chat({ chat }: { chat: DBChat | null }) {
  const currentChatId = useMemo(() => {
    return chat?.id ?? crypto.randomUUID();
  }, [chat?.id]);
  const isNewChat = chat == null;

  const router = useRouter();

  const { messages, sendMessage } = useChat<MyUIMessage>({
    id: currentChatId,
    messages: chat?.messages ?? [],
    onData: (message) => {
      if (message.type === "data-frontend-chat") {
        router.refresh();
      }
    },
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: (request) => {
        return {
          body: {
            id: request.body?.id,
            message: request.messages?.at(-1)
          }
        };
      }
    })
  });

  const { state, scrollRef, contentRef, scrollToBottom } = useStickToBottom({});
  const scrollToBottomButtonVisible = state.isAtBottom === false;

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden">
      <div className="flex-1 overflow-y-auto" id="scroller" ref={scrollRef}>
        <MessagesList ref={contentRef} messages={messages} />
      </div>
      <ScrollToBottomIndicator.Anchor className="mb-2" />
      <Form
        onSubmit={(value) => {
          console.log("sending message");
          sendMessage({ text: value }, { body: { id: currentChatId } });
          scrollToBottom();

          if (isNewChat) {
            router.replace(`/?chatId=${currentChatId}`);
          }
        }}
      />
      <ScrollToBottomIndicator
        visible={scrollToBottomButtonVisible}
        onScrollToBottom={() => {
          scrollToBottom();
        }}
      />
    </div>
  );
}

export function Sidebar({
  chats,
  selectedChatId,
  sidebarToggleId
}: {
  chats: Array<{ id: string; title: string }>;
  selectedChatId: string | undefined;
  sidebarToggleId: string;
}) {
  return (
    <div className="drawer-side">
      <label
        htmlFor={sidebarToggleId}
        aria-label="close sidebar"
        className="drawer-overlay"
      />
      <aside className="menu bg-base-200 min-h-full w-72 p-4">
        <div className="mb-4 flex items-center gap-2 px-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="font-semibold text-lg">Chats</span>
        </div>

        <Link
          href="/#chat-text-input"
          className="btn btn-primary btn-block mb-4"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Chat
        </Link>

        <ul className="flex flex-col max-w-full">
          {chats.map((chat) => {
            const isSelected = selectedChatId === chat.id;
            return (
              <li key={chat.id} className="group block">
                <div
                  className={clsx(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors",
                    isSelected
                      ? "bg-primary text-primary-content"
                      : "hover:bg-base-300"
                  )}
                >
                  <Link
                    href={`/?chatId=${chat.id}`}
                    className="flex-1 min-w-0 truncate text-left"
                  >
                    {chat.title}
                  </Link>
                  <DeleteChatButton chatId={chat.id} isSelected={isSelected} />
                </div>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}

function DeleteChatButton({
  chatId,
  isSelected
}: {
  chatId: string;
  isSelected: boolean;
}) {
  const [, dispatch, isPending] = useActionState(
    () => deleteChatAction({ id: chatId }),
    null
  );

  return (
    <form>
      <button
        type="submit"
        formAction={dispatch}
        disabled={isPending}
        className={clsx(
          "btn btn-ghost btn-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
          isSelected ? "hover:bg-primary-focus" : "hover:bg-base-300"
        )}
        aria-label="Delete chat"
      >
        {isPending ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        )}
      </button>
    </form>
  );
}

export function ChatTitle({
  title,
  sidebarToggleId
}: {
  title: string;
  sidebarToggleId: string;
}) {
  return (
    <header className="navbar bg-base-300">
      <div className="flex-none lg:hidden">
        <label
          htmlFor={sidebarToggleId}
          aria-label="open sidebar"
          className="btn btn-square btn-ghost"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="inline-block h-6 w-6 stroke-current"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </label>
      </div>
      <div className="flex-1 px-2">
        <h1 className="text-lg font-semibold truncate">{title}</h1>
      </div>
    </header>
  );
}

const FormDataSchema = z.object({
  text: z.string()
});

export function Form({ onSubmit }: { onSubmit: (value: string) => void }) {
  const sendMessageAction = async (_prevState: null, data: FormData) => {
    const { text } = FormDataSchema.parse(Object.fromEntries(data.entries()));
    onSubmit(text);

    return null;
  };

  const [, dispatchAction, isPending] = useActionState(sendMessageAction, null);

  return (
    <form action={dispatchAction} className="flex gap-2">
      <input
        type="text"
        name="text"
        id="chat-text-input"
        className="input input-bordered flex-1"
        placeholder="Type a message..."
        autoFocus={true}
      />
      <button disabled={isPending} type="submit" className="btn btn-primary">
        Send
      </button>
    </form>
  );
}

type UIMessageParts = MyUIMessage["parts"][number];
type UIMessagePartTypes = UIMessageParts["type"];

type UIMessagePartsRenderers = {
  [PartType in UIMessagePartTypes]: ({
    part
  }: {
    part: Extract<UIMessageParts, { type: PartType }>;
  }) => React.ReactNode;
};

function TextPartRenderer({ part }: { part: TextUIPart }) {
  if (part.text.trim().length < 1 || part.state === "streaming") {
    return <span className="loading loading-dots loading-xs"></span>;
  }

  return (
    <Markdown
      components={{
        pre: ({ children }) => (
          <pre className="bg-base-300 p-3 rounded-lg overflow-x-auto my-2">
            {children}
          </pre>
        ),
        code: ({ children, className }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-base-300 px-1.5 py-0.5 rounded text-sm">
                {children}
              </code>
            );
          }
          return <code className={className}>{children}</code>;
        },
        ul: ({ children }) => (
          <ul className="list-disc list-inside my-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside my-2">{children}</ol>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            className="link link-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        p: ({ children }) => <p className="my-1">{children}</p>,
        h1: ({ children }) => (
          <h1 className="text-xl font-bold my-2">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-bold my-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-bold my-1">{children}</h3>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-base-300 pl-4 my-2 italic">
            {children}
          </blockquote>
        )
      }}
    >
      {part.text}
    </Markdown>
  );
}

type ToolUIPart = Extract<UIMessageParts, { toolCallId: string }>;

function ToolInvocationPartRenderer({ part }: { part: ToolUIPart }) {
  const toolName = getToolName(part);
  const isLoading =
    part.state === "input-streaming" || part.state === "input-available";
  const hasOutput = part.state === "output-available";
  const hasError = part.state === "output-error";

  return (
    <div className="collapse collapse-arrow bg-base-200 my-2">
      <input type="checkbox" defaultChecked={false} />
      <div className="collapse-title flex items-center gap-2 text-sm font-medium">
        {isLoading ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        )}
        <span>{toolName}</span>
        {hasOutput && (
          <span className="badge badge-success badge-xs ml-auto">done</span>
        )}
        {hasError && (
          <span className="badge badge-error badge-xs ml-auto">error</span>
        )}
      </div>
      <div className="collapse-content text-xs">
        <div className="mb-2">
          <span className="font-semibold">Input:</span>
          <pre className="bg-base-300 p-2 rounded mt-1 overflow-x-auto">
            {JSON.stringify(part.input, null, 2)}
          </pre>
        </div>
        {hasOutput && (
          <div>
            <span className="font-semibold">Output:</span>
            <pre className="bg-base-300 p-2 rounded mt-1 overflow-x-auto max-h-48">
              {JSON.stringify(part.output, null, 2)}
            </pre>
          </div>
        )}
        {hasError && (
          <div>
            <span className="font-semibold text-error">Error:</span>
            <pre className="bg-error/10 text-error p-2 rounded mt-1 overflow-x-auto">
              {part.errorText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

const Renderers: Partial<UIMessagePartsRenderers> = {
  text: TextPartRenderer,
  "tool-searchEmails": ToolInvocationPartRenderer
};

function MessagesListEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-base-content/60">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-16 mb-4"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 10h.01" />
        <path d="M12 10h.01" />
        <path d="M16 10h.01" />
      </svg>
      <p className="text-lg font-medium">No messages yet</p>
      <p className="text-sm">Start a conversation below</p>
    </div>
  );
}

export function MessagesList({
  messages,
  ref
}: {
  messages: Array<MyUIMessage>;
  ref?: Ref<HTMLUListElement>;
}) {
  if (!messages.length) {
    return <MessagesListEmptyState />;
  }

  return (
    <ul className="flex flex-col gap-2" ref={ref}>
      {messages.map((message) => {
        const isUser = message.role === "user";
        const isAssistant = message.role === "assistant";

        return (
          <li
            key={message.id}
            className={clsx("chat", {
              "chat-end": isUser,
              "chat-start": isAssistant
            })}
          >
            <div
              className={clsx("chat-bubble", {
                "chat-bubble-primary": isUser
              })}
            >
              {message.parts.length === 0 ? (
                <Fragment>
                  <TextPartRenderer
                    part={{ text: "", state: "streaming", type: "text" }}
                  />
                </Fragment>
              ) : null}

              {message.parts.map((part, index) => {
                const renderer = Renderers[part.type];
                if (!renderer) {
                  return null;
                }

                return (
                  <Fragment key={`${message.id}-${part.type}-${index}`}>
                    {renderer({ part } as { part: never })}
                  </Fragment>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

import { deleteChatAction } from "@/app/actions";
import type { DBChat } from "@/app/persistance";
import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Markdown from "react-markdown";
import { useStickToBottom } from "use-stick-to-bottom";
import "./scroll-to-bottom-indicator.css";

export function ScrollToBottomIndicator({
  visible,
  onScrollToBottom
}: {
  visible: boolean;
  onScrollToBottom: VoidFunction;
}) {
  const popoverRef = useRef<ComponentRef<"div">>(null);

  useEffect(() => {
    if (visible) {
      popoverRef.current?.showPopover();
    } else {
      popoverRef.current?.hidePopover();
    }
  }, [visible]);

  return (
    <div
      className="popover mb-2 overflow-hidden"
      popover={"manual"}
      ref={popoverRef}
    >
      <button
        type="button"
        className="btn btn-block btn-xs"
        onClick={() => {
          onScrollToBottom();
        }}
      >
        Scroll to bottom
      </button>
    </div>
  );
}

ScrollToBottomIndicator.Anchor = function PopoverAnchor({
  className
}: {
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "popover-anchor m-auto w-full pointer-events-none",
        className
      )}
      aria-hidden={true}
    />
  );
};
