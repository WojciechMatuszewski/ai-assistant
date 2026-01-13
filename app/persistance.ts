import { logger } from "@/src/logger";
import type { MyUIMessage } from "@/src/types";
import { safeValidateUIMessages } from "ai";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import z from "zod";

const DBSchatSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  messages: z.custom<Array<MyUIMessage>>(async (messages) => {
    const { success } = await safeValidateUIMessages({ messages });
    return success;
  }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

const DBEmailSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  from: z.string(),
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  timestamp: z.iso.datetime(),
  arcId: z.string().optional(),
  phaseId: z.number().optional(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).optional()
});

export type DBEmail = z.infer<typeof DBEmailSchema>;

export type DBChat = z.infer<typeof DBSchatSchema>;

const DBSchatsSchema = z.array(DBSchatSchema);

const DATA_DIR = path.join(process.cwd(), "data");
const CHATS_PATH = path.join(DATA_DIR, "chats.json");
const EMAILS_PATH = path.join(DATA_DIR, "emails.json");

const DBEmailsSchema = z.array(DBEmailSchema);

let dataDirCreated = false;

async function ensureDataDir(): Promise<void> {
  if (dataDirCreated) {
    return;
  }
  await mkdir(DATA_DIR, { recursive: true });
  dataDirCreated = true;
}

async function readChats(): Promise<Array<DBChat>> {
  const content = await readFile(CHATS_PATH, "utf-8").catch(() => null);
  if (!content) {
    return [];
  }
  const parsed = JSON.parse(content);
  return DBSchatsSchema.parseAsync(parsed);
}

async function readEmails(): Promise<Array<DBEmail>> {
  const content = await readFile(EMAILS_PATH, "utf-8").catch(() => null);
  if (!content) {
    return [];
  }

  const parsed = JSON.parse(content);
  return DBEmailsSchema.parseAsync(parsed);
}

async function writeChats(chats: Array<DBChat>): Promise<void> {
  await ensureDataDir();
  await writeFile(CHATS_PATH, JSON.stringify(chats, null, 2), "utf-8");
}

export async function getAllChats(): Promise<Array<DBChat>> {
  return readChats();
}

export async function getAllEmails(): Promise<Array<DBEmail>> {
  logger.info("Loading all emails");

  return readEmails();
}

export async function getChatById({
  id
}: {
  id: string | undefined | null;
}): Promise<DBChat | null> {
  const chats = await readChats();
  return chats.find((chat) => chat.id === id) ?? null;
}

export async function saveChat({ chat }: { chat: DBChat }): Promise<void> {
  const chats = await readChats();
  chats.push(chat);
  await writeChats(chats);
}

export async function updateChat({
  id,
  updates
}: {
  id: string;
  updates: Partial<Pick<DBChat, "title" | "messages">>;
}): Promise<DBChat | null> {
  const chats = await readChats();
  const index = chats.findIndex((chat) => chat.id === id);

  if (index === -1) {
    return null;
  }

  chats[index] = {
    ...chats[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await writeChats(chats);
  return chats[index];
}

export async function deleteChat({ id }: { id: string }): Promise<boolean> {
  const chats = await readChats();
  const initialLength = chats.length;
  const filtered = chats.filter((chat) => chat.id !== id);

  if (filtered.length === initialLength) {
    return false;
  }

  await writeChats(filtered);
  return true;
}

export async function appendChatMessages({
  id,
  messages
}: {
  id: string;
  messages: Array<MyUIMessage>;
}): Promise<DBChat | null> {
  const chats = await readChats();
  const index = chats.findIndex((chat) => chat.id === id);

  if (index === -1) {
    return null;
  }

  chats[index] = {
    ...chats[index],
    messages: [...chats[index].messages, ...messages],
    updatedAt: new Date().toISOString()
  };

  await writeChats(chats);
  return chats[index];
}
