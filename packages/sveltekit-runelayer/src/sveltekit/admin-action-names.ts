export const ADMIN_ACTION_NAMES = [
  "login",
  "createFirstUser",
  "create",
  "update",
  "delete",
  "publish",
  "unpublish",
  "saveDraft",
  "restoreVersion",
  "publishGlobal",
  "unpublishGlobal",
  "saveDraftGlobal",
  "restoreGlobalVersion",
  "logout",
  "createUser",
  "updateUser",
  "deleteUser",
] as const;

export type AdminActionName = (typeof ADMIN_ACTION_NAMES)[number];
