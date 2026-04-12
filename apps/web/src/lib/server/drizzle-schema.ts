import { createDrizzleKitSchema } from "@flaming-codes/sveltekit-runelayer/drizzle";
import { allCollections } from "./schema.js";

// drizzle-kit discovers Drizzle table instances from top-level named exports.
// Spread the generated schema so each table is individually exported.
const _schema = createDrizzleKitSchema(allCollections);
const {
  site_chrome,
  site_chrome_versions,
  pages,
  pages_versions,
  user,
  session,
  account,
  verification,
} = _schema;

export {
  site_chrome,
  site_chrome_versions,
  pages,
  pages_versions,
  user,
  session,
  account,
  verification,
};
