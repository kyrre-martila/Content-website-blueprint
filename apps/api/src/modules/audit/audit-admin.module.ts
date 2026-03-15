import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { AuditController } from "./audit.controller";
import { AuditModule } from "./audit.module";

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AuditController],
})
export class AuditAdminModule {}
