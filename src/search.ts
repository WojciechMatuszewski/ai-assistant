"server-only";

import { getEnv } from "@/src/env";
import { createOpenAI } from "@ai-sdk/openai";
import { cosineSimilarity, embed, embedMany } from "ai";
import { chunk } from "es-toolkit";
import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const embeddingsLLMProvider = createOpenAI({
  apiKey: getEnv().OPENAI_API_KEY
});

export async function searchWithEmbeddings<T extends { id: string }>({
  query,
  items,
  toText
}: {
  query: string;
  items: Array<T>;
  toText: (item: T) => string;
}) {
  /**
   * TODO: Add `item` on the embedding item
   */
  const embeddings = await loadOrGenerateEmbeddings({ items, toText });

  const { embedding: queryEmbedding } = await embed({
    model: embeddingsLLMProvider.embeddingModel("text-embedding-3-small"),
    value: query
  });
}

const EMBEDDINGS_DIR = path.join(process.cwd(), "data", "embeddings");

let embeddingsDirCreated = false;

async function ensureEmbeddingsDir() {
  if (embeddingsDirCreated) {
    return;
  }

  await mkdir(EMBEDDINGS_DIR, { recursive: true });
  embeddingsDirCreated = true;
}

async function loadOrGenerateEmbeddings<T extends { id: string }>({
  items,
  toText
}: {
  items: Array<T>;
  toText: (item: T) => string;
}) {
  await ensureEmbeddingsDir();

  const cachedEmbeddings: Array<{ id: string; embedding: Array<number> }> = [];
  const uncachedItems: Array<T> = [];

  for (const item of items) {
    const text = toText(item);
    const cachedEmbedding = await getCachedEmbedding({ text });
    if (cachedEmbedding) {
      cachedEmbeddings.push({ id: item.id, embedding: cachedEmbedding });
    } else {
      uncachedItems.push(item);
    }
  }

  if (uncachedItems.length === 0) {
    return cachedEmbeddings;
  }

  const embeddings: Array<{ id: string; embedding: Array<number> }> = [
    ...cachedEmbeddings
  ];

  const chunks = chunk(uncachedItems, 99);
  for (const chunk of chunks) {
    const { embeddings: createdEmbeddings } = await embedMany({
      maxParallelCalls: 10,
      model: embeddingsLLMProvider.embeddingModel("text-embedding-3-small"),
      values: chunk.map((chunkPiece) => {
        return toText(chunkPiece);
      })
    });

    const pendingEmbeddingSaves = createdEmbeddings.map(
      (createdEmbedding, index) => {
        const chunkPiece = chunk[index];

        embeddings.push({
          embedding: createdEmbedding,
          id: chunkPiece.id
        });

        return writeEmbeddingToCache({
          text: toText(chunkPiece),
          embedding: createdEmbedding
        });
      }
    );

    await Promise.all(pendingEmbeddingSaves);
  }

  return embeddings;
}

async function getCachedEmbedding({ text }: { text: string }) {
  const hash = hashText({ text });
  const filePath = path.join(EMBEDDINGS_DIR, `${hash}.json`);

  try {
    const cached = await readFile(filePath, "utf-8");
    return await JSON.parse(cached);
  } catch {
    return null;
  }
}

async function writeEmbeddingToCache({
  text,
  embedding
}: {
  text: string;
  embedding: Array<number>;
}) {
  const hash = hashText({ text });
  const filePath = path.join(EMBEDDINGS_DIR, `${hash}.json`);
  await writeFile(filePath, JSON.stringify(embedding));
}

async function hashText({ text }: { text: string }) {
  const hashed = crypto
    .createHash("sha256")
    .update(text)
    .digest("hex")
    .slice(0, 10);

  return hashed;
}
