import { type StoreApi, type UseBoundStore, create } from "zustand";
import { type BaseComposerState, makeBaseComposer } from "./BaseComposer";
import type { ThreadState } from "./Thread";

// thread

export type ThreadComposerState = BaseComposerState &
  Readonly<{
    isEditing: true;

    send: () => void;
    cancel: () => boolean;
  }>;

export const makeThreadComposerStore = (
  useThread: StoreApi<ThreadState>,
): UseBoundStore<StoreApi<ThreadComposerState>> =>
  create<ThreadComposerState>()((set, get, store) => {
    return {
      ...makeBaseComposer(set, get, store),

      isEditing: true,

      send: () => {
        const { value } = get();
        set({ value: "" });

        useThread.getState().append({
          parentId: useThread.getState().messages.at(-1)?.id ?? null,
          content: [{ type: "text", text: value }],
        });
      },
      cancel: () => {
        const thread = useThread.getState();
        if (!thread.isRunning) return false;

        useThread.getState().cancelRun();
        return true;
      },
    };
  });
