import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersAdminController } from "./users-admin.controller";
import { UsersPrismaRepository } from "@org/domain-adapters-prisma";
import {
  UsersService as UsersDomainService,
  type UsersRepository,
} from "@org/domain";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [UsersController, UsersAdminController],
  providers: [
    {
      provide: "UsersRepository",
      useClass: UsersPrismaRepository,
    },
    {
      provide: UsersDomainService,
      useFactory: (repository: UsersRepository) =>
        new UsersDomainService(repository),
      inject: ["UsersRepository"],
    },
  ],
  exports: [UsersDomainService],
})
export class UsersModule {}
