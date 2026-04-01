import { createDrizzleKitSchema } from "@flaming-codes/sveltekit-runelayer";
import { allCollections } from "./schema.js";

export const runelayerSchema = createDrizzleKitSchema(allCollections);
