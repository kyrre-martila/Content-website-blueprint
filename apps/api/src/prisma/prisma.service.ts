import { INestApplication, Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Database connection failed. Check DATABASE_URL and confirm the database is reachable. ${details}`,
      );
    }
  }
  async enableShutdownHooks(app: INestApplication) {
    this.$on("beforeExit" as never, async () => {
      await app.close();
    });
  }
}
