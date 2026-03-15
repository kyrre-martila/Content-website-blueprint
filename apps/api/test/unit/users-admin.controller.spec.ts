import { ForbiddenException } from "@nestjs/common";

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import type { Request } from "express";
import type { UsersRepository } from "@org/domain";

import { UsersAdminController } from "../../src/modules/users/users-admin.controller";
import type { AuthService } from "../../src/modules/auth/auth.service";
import type { AuditService } from "../../src/modules/audit/audit.service";

describe("UsersAdminController", () => {
  function makeRequest(token = "test-token"): Request {
    return {
      headers: { authorization: `Bearer ${token}` },
      cookies: {},
    } as unknown as Request;
  }

  function makeSut(input?: {
    actor?: { id: string; role: string };
    target?: { id: string; role: "editor" | "admin" | "super_admin" };
  }) {
    const actor = input?.actor ?? { id: "admin-1", role: "admin" };
    const target = input?.target ?? { id: "target-1", role: "editor" as const };

    const usersRepository: jest.Mocked<UsersRepository> = {
      findById: jest.fn().mockResolvedValue({
        id: target.id,
        email: "target@example.com",
        role: target.role,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      }),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({
        id: target.id,
        email: "target@example.com",
        role: "super_admin",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-02T00:00:00.000Z"),
      }),
    };

    const auth = {
      validateUser: jest.fn().mockResolvedValue(actor),
    } as unknown as jest.Mocked<AuthService>;

    const audit = {
      log: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    const controller = new UsersAdminController(usersRepository, auth, audit);

    return { controller, usersRepository, auth, audit, actor, target };
  }

  it("rejects admin granting super_admin", async () => {
    const { controller, usersRepository, audit } = makeSut({
      actor: { id: "admin-1", role: "admin" },
      target: { id: "user-2", role: "editor" },
    });

    await expect(
      controller.updateRole(makeRequest(), "user-2", { role: "super_admin" }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(usersRepository.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("allows superadmin granting super_admin", async () => {
    const { controller, usersRepository, audit } = makeSut({
      actor: { id: "super-1", role: "super_admin" },
      target: { id: "user-2", role: "admin" },
    });

    await expect(
      controller.updateRole(makeRequest(), "user-2", { role: "super_admin" }),
    ).resolves.toEqual({ id: "user-2", role: "super_admin" });

    expect(usersRepository.update).toHaveBeenCalledWith("user-2", {
      role: "super_admin",
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "user_role_change",
        entityType: "user",
        entityId: "user-2",
        metadata: {
          previousRole: "admin",
          nextRole: "super_admin",
        },
      }),
    );
  });

  it("rejects admin self-escalation to super_admin", async () => {
    const { controller, usersRepository } = makeSut({
      actor: { id: "admin-1", role: "admin" },
      target: { id: "admin-1", role: "admin" },
    });

    await expect(
      controller.updateRole(makeRequest(), "admin-1", { role: "super_admin" }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(usersRepository.update).not.toHaveBeenCalled();
  });
});
