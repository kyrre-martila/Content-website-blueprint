import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";

import { AuthService } from "../../src/modules/auth/auth.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const bcrypt = jest.requireMock("bcrypt") as {
  hash: jest.MockedFunction<(password: string, saltRounds: number) => Promise<string>>;
  compare: jest.MockedFunction<(plain: string, hash: string) => Promise<boolean>>;
};

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

type JwtMock = {
  sign: jest.Mock;
  verify: jest.Mock;
};

type ServiceOptions = {
  saltRounds?: number;
};

const createService = (options: ServiceOptions = {}) => {
  const prisma: PrismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const jwt: JwtMock = {
    sign: jest.fn(),
    verify: jest.fn(),
  };
  const configGet = jest.fn((key: string) => {
    if (key === "BCRYPT_SALT_ROUNDS" && options.saltRounds !== undefined) {
      return String(options.saltRounds);
    }
    return undefined;
  });
  const config = {
    get: configGet,
  } as unknown as ConfigService;

  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    config,
  );

  return { service, prisma, jwt };
};

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers a new user with hashed password", async () => {
    const { service, prisma, jwt } = createService();
    prisma.user.findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed-pass");
    prisma.user.create.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      passwordHash: "hashed-pass",
      name: "Test User",
      displayName: "Test User",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    jwt.sign.mockReturnValue("signed-token");

    const result = await service.register({
      email: "test@example.com",
      password: "Password123",
      name: "Test User",
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "test@example.com",
        passwordHash: "hashed-pass",
        name: "Test User",
        displayName: "Test User",
      }),
    });
    expect(result).toEqual({
      user: { id: "user-1", email: "test@example.com", name: "Test User" },
      accessToken: "signed-token",
    });
  });

  it("rejects duplicate emails on registration", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: "existing" });

    await expect(
      service.register({ email: "taken@example.com", password: "Password123" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("registers a user without an explicit name", async () => {
    const { service, prisma, jwt } = createService();
    prisma.user.findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed-pass");
    prisma.user.create.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      passwordHash: "hashed-pass",
      name: null,
      displayName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    jwt.sign.mockReturnValue("signed-token");

    const result = await service.register({
      email: "test@example.com",
      password: "Password123",
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: null, displayName: null }),
    });
    expect(result.user.name).toBeNull();
  });

  it("authenticates a user with valid credentials", async () => {
    const { service, prisma, jwt } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "stored-hash",
      name: null,
      displayName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("access-token");

    const result = await service.login({
      email: "user@example.com",
      password: "Secret123",
    });

    expect(result).toEqual({
      user: { id: "user-1", email: "user@example.com", name: null },
      accessToken: "access-token",
    });
  });

  it("rejects invalid passwords", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "stored-hash",
    });
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      service.login({ email: "user@example.com", password: "WrongPass" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects login when no user is found", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: "missing@example.com", password: "Password123" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("decodes and validates a user from a token", async () => {
    const { service, prisma, jwt } = createService();
    jwt.verify.mockReturnValue({ sub: "user-1", email: "user@example.com" });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "hash",
      name: "User",
      displayName: "User",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.validateUser("token");
    expect(result).toEqual({ id: "user-1", email: "user@example.com", name: "User" });
  });

  it("returns null for invalid tokens", () => {
    const { service, jwt } = createService();
    jwt.verify.mockImplementation(() => {
      throw new Error("invalid");
    });

    expect(service.decodeToken("bad-token")).toBeNull();
  });

  it("returns null when decoding empty tokens", () => {
    const { service } = createService();
    expect(service.decodeToken("")).toBeNull();
  });

  it("throws when token payload cannot be decoded", async () => {
    const { service, jwt } = createService();
    jwt.verify.mockImplementation(() => {
      throw new Error("invalid");
    });

    await expect(service.validateUser("bad-token")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("throws when no user matches the token subject", async () => {
    const { service, prisma, jwt } = createService();
    jwt.verify.mockReturnValue({ sub: "user-1", email: "user@example.com" });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.validateUser("token")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("hashes passwords using configured salt rounds", async () => {
    const { service } = createService({ saltRounds: 12 });
    bcrypt.hash.mockResolvedValue("hashed");

    await service.hashPassword("Password123");

    expect(bcrypt.hash).toHaveBeenCalledWith("Password123", 12);
  });
});
