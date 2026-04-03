import { createDrizzleKitSchema } from "@flaming-codes/sveltekit-runelayer/drizzle";
import { allCollections } from "./schema.js";

// drizzle-kit discovers Drizzle table instances from top-level named exports.
// Spread the generated schema so each table is individually exported.
const _schema = createDrizzleKitSchema(allCollections);
const { pages, pages_blocks, user, session, account, verification } = _schema;
export { pages, pages_blocks, user, session, account, verification };
