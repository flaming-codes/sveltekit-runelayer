import { createDrizzleKitSchema } from "@flaming-codes/sveltekit-runelayer/drizzle";
import { allCollections, allGlobals } from "./schema.js";

// drizzle-kit discovers Drizzle table instances from top-level named exports.
// Destructure and re-export each table individually.
const _schema = createDrizzleKitSchema(allCollections, allGlobals);
export const {
  authors,
  authors_socialLinks,
  categories,
  posts,
  media,
  pages,
  pages_sections,
  products,
  site_settings,
  navigation,
  __runelayer_globals,
  user,
  session,
  account,
  verification,
} = _schema;
