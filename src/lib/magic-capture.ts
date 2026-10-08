import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * In-process capture of a freshly minted magic link. Only server code can enter this
 * context, so the public sign-in endpoint can never redirect a link into it.
 */
export const magicCapture = new AsyncLocalStorage<{ url?: string }>();
