"use server";

import { deleteChat } from "@/app/persistance";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteChatAction({ id }: { id: string }) {
  await deleteChat({ id });
  revalidatePath("/");
  redirect("/");
}
