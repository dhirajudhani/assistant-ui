"use client";

import type { VercelRSCAdapter } from "./VercelRSCAdapter";
import {
  ExternalStoreAdapter,
  getExternalStoreMessage,
  TextContentPartComponent,
  ThreadMessageLike,
  useExternalMessageConverter,
  useExternalStoreRuntime,
  useMessage,
  useThread,
} from "@assistant-ui/react";
import { VercelRSCMessage } from "./VercelRSCMessage";
import { useCallback, useMemo } from "react";

const symbolInternalRSCExtras = Symbol("internal-rsc-extras");

type RSCThreadExtras =
  | {
      [symbolInternalRSCExtras]?: {
        convertFn: (message: any) => VercelRSCMessage;
      };
    }
  | undefined;

export const RSCDisplay: TextContentPartComponent = () => {
  const convertFn = useThread((t) => {
    const extras = (t.extras as RSCThreadExtras)?.[symbolInternalRSCExtras];
    if (!extras)
      throw new Error(
        "This function can only be used inside a Vercel RSC runtime.",
      );
    return extras.convertFn;
  });
  return useMessage((m) => convertFn(getExternalStoreMessage(m)).display);
};

const vercelToThreadMessage = <T,>(
  converter: (message: T) => VercelRSCMessage,
  rawMessage: T,
): ThreadMessageLike => {
  const message = converter(rawMessage);

  return {
    id: message.id,
    role: message.role,
    content: [{ type: "ui", display: message.display }],
    createdAt: message.createdAt,
  };
};

export const useVercelRSCRuntime = <T extends WeakKey>(
  adapter: VercelRSCAdapter<T>,
) => {
  const onNew = adapter.onNew;
  if (!onNew)
    throw new Error("You must pass a onNew function to useVercelRSCRuntime");

  const convertFn = useMemo(() => {
    return (
      adapter.convertMessage?.bind(adapter) ?? ((m: T) => m as VercelRSCMessage)
    );
  }, [adapter.convertMessage]);
  const callback = useCallback(
    (m: T) => {
      return vercelToThreadMessage(convertFn, m);
    },
    [convertFn],
  );

  const messages = useExternalMessageConverter({
    callback,
    isRunning: adapter.isRunning ?? false,
    messages: adapter.messages,
  });

  const eAdapter: ExternalStoreAdapter = {
    isRunning: adapter.isRunning,
    messages,
    onNew,
    onEdit: adapter.onEdit,
    onReload: adapter.onReload,
    adapters: adapter.adapters,
    unstable_capabilities: {
      copy: false,
    },
    extras: {
      [symbolInternalRSCExtras]: { convertFn },
    },
  };

  const runtime = useExternalStoreRuntime(eAdapter);
  return runtime;
};
