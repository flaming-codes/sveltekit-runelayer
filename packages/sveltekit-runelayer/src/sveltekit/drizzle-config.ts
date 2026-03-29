export interface RunelayerDrizzleConfigInput {
  schema: string | string[];
  out?: string;
  database: {
    url: string;
    authToken?: string;
  };
  dialect?: "sqlite" | "turso";
}

export function defineRunelayerDrizzleConfig(input: RunelayerDrizzleConfigInput) {
  const dialect = input.dialect ?? (input.database.authToken ? "turso" : "sqlite");

  if (dialect === "turso") {
    return {
      dialect,
      schema: input.schema,
      out: input.out ?? "./drizzle",
      dbCredentials: {
        url: input.database.url,
        authToken: input.database.authToken,
      },
    };
  }

  return {
    dialect,
    schema: input.schema,
    out: input.out ?? "./drizzle",
    dbCredentials: {
      url: input.database.url,
    },
  };
}
