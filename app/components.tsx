"use client";

import type { MyUIMessage } from "@/src/types";
import type { TextUIPart } from "ai";
import clsx from "clsx";
import {
  Fragment,
  useActionState,
  useEffect,
  useRef,
  type ComponentRef,
  type Ref
} from "react";
import z from "zod";

type Chat = {
  id: string;
  title: string;
};

export function Sidebar({
  chats,
  selectedChatId,
  onSelectChat,
  sidebarToggleId
}: {
  chats: Array<Chat>;
  selectedChatId: string;
  onSelectChat: (id: string) => void;
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

        <ul className="flex flex-col gap-1">
          {chats.map((chat) => (
            <li key={chat.id}>
              <a
                href={`/chat/${chat.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectChat(chat.id);
                }}
                className={clsx(
                  "w-full text-left truncate",
                  selectedChatId === chat.id && "active"
                )}
              >
                {chat.title}
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
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
        id="text"
        className="input input-bordered flex-1"
        placeholder="Type a message..."
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

  return <span>{part.text}</span>;
}

const Renderers: Partial<UIMessagePartsRenderers> = {
  text: TextPartRenderer
};

export function MessagesList({
  messages,
  ref
}: {
  messages: Array<MyUIMessage>;
  ref?: Ref<HTMLUListElement>;
}) {
  if (!messages.length) {
    return null;
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
      className="popover overflow-hidden"
      popover={"manual"}
      ref={popoverRef}
    >
      <button
        type="button"
        className="btn btn-outline btn-xs"
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
    <div className={clsx("popover-anchor", className)} aria-hidden={true} />
  );
};
