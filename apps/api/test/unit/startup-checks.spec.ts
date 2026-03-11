import {
  assertMigrationsApplied,
  validateRequiredEnvVariables,
} from "../../src/config/startup-checks";

describe("startup checks", () => {
  describe("validateRequiredEnvVariables", () => {
    it("throws when required environment variables are missing", () => {
      expect(() =>
        validateRequiredEnvVariables({
          DATABASE_URL: "",
          JWT_SECRET: "",
          COOKIE_SECRET: "cookie-secret",
          ENCRYPTION_KEY: undefined,
        }),
      ).toThrow(
        "Missing required environment variables: DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY",
      );
    });

    it("does not throw when all required environment variables are present", () => {
      expect(() =>
        validateRequiredEnvVariables({
          DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/appdb",
          JWT_SECRET: "jwt-secret",
          COOKIE_SECRET: "cookie-secret",
          ENCRYPTION_KEY: "encryption-key",
        }),
      ).not.toThrow();
    });
  });

  describe("assertMigrationsApplied", () => {
    it("throws when migration metadata table is missing", async () => {
      const prisma = {
        $queryRawUnsafe: jest
          .fn()
          .mockResolvedValueOnce([{ migration_table: null }]),
      };

      await expect(assertMigrationsApplied(prisma as never)).rejects.toThrow(
        "Database migrations have not been run",
      );
    });

    it("throws when no completed migrations exist", async () => {
      const prisma = {
        $queryRawUnsafe: jest
          .fn()
          .mockResolvedValueOnce([{ migration_table: '"_prisma_migrations"' }])
          .mockResolvedValueOnce([{ count: 0 }]),
      };

      await expect(assertMigrationsApplied(prisma as never)).rejects.toThrow(
        "no applied Prisma migrations were found",
      );
    });

    it("passes when at least one migration has been applied", async () => {
      const prisma = {
        $queryRawUnsafe: jest
          .fn()
          .mockResolvedValueOnce([{ migration_table: '"_prisma_migrations"' }])
          .mockResolvedValueOnce([{ count: 1 }]),
      };

      await expect(
        assertMigrationsApplied(prisma as never),
      ).resolves.toBeUndefined();
    });
  });
});
