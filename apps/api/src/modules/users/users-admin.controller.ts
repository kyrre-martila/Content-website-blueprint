import { Body, Controller, Param, Patch, Req } from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import type { Request } from "express";

import { requireMinimumRole } from "../../common/auth/admin-access";
import { readAccessToken } from "../../common/auth/read-access-token";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthService } from "../auth/auth.service";

class UpdateUserRoleDto {
  @ApiProperty({ enum: ["editor", "admin", "super_admin"] })
  @IsIn(["editor", "admin", "super_admin"])
  role!: "editor" | "admin" | "super_admin";
}

@ApiTags("users")
@Controller("admin/users")
export class UsersAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Patch(":id/role")
  async updateRole(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateUserRoleDto,
  ) {
    await requireMinimumRole(req, this.auth, "admin");

    const actorId = await this.getCurrentUserId(req);
    const existing = await this.prisma.user.findUnique({ where: { id } });
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: body.role },
    });

    this.audit.log({
      userId: actorId,
      action: "user_role_change",
      entityType: "user",
      entityId: id,
      metadata: {
        previousRole: existing?.role ?? null,
        nextRole: updated.role,
      },
    });

    return { id: updated.id, role: updated.role };
  }

  private async getCurrentUserId(req: Request): Promise<string | null> {
    const access = readAccessToken(req);
    if (!access) {
      return null;
    }

    try {
      const user = await this.auth.validateUser(access);
      return user.id;
    } catch {
      return null;
    }
  }
}
