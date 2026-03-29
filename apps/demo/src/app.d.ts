import type { User, Session } from "@flaming-codes/sveltekit-runelayer";

declare global {
  namespace App {
    interface Locals {
      user?: User;
      session?: Session;
    }
  }
}
export {};
