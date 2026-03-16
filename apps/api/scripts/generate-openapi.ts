import "reflect-metadata";
import Module from "node:module";
import type { Module as NodeModule } from "node:module";
import { resolve } from "node:path";

import { RequestMethod } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { API_PREFIX } from "../src/config/api-prefix";
import {
  createOpenApiDocument,
  writeCanonicalOpenApiDocument,
} from "../src/openapi/openapi-document";
import { PrismaService } from "../src/prisma/prisma.service";

const OPENAPI_OUTPUT_PATH = resolve(
  __dirname,
  "../../../packages/contracts/openapi.v1.json",
);

const REPOSITORY_PROVIDER_TOKENS = [
  "UsersRepository",
  "PagesRepository",
  "ContentTypesRepository",
  "ContentItemsRepository",
  "PageBlocksRepository",
  "TaxonomiesRepository",
  "TermsRepository",
  "ContentItemTermsRepository",
  "NavigationItemsRepository",
  "SiteSettingsRepository",
  "MediaRepository",
] as const;

function stubBcryptNativeBinding() {
  const moduleWithLoad = Module as typeof Module & {
    _load: (
      request: string,
      parent: NodeModule | null | undefined,
      isMain: boolean,
    ) => unknown;
  };
  const originalLoad = moduleWithLoad._load;
  moduleWithLoad._load = function patchedModuleLoad(
    request: string,
    parent: NodeModule | null | undefined,
    isMain: boolean,
  ) {
    if (request === "bcrypt") {
      return {
        hash: async () => "",
        compare: async () => true,
        genSalt: async () => "",
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
}

async function generateOpenApi() {
  process.env.JWT_SECRET ??= "openapi-dev-secret";
  process.env.JWT_EXPIRES_IN ??= "1h";
  process.env.COOKIE_SECRET ??= "openapi-cookie-secret";
  process.env.REGISTRATION_ENABLED ??= "true";
  stubBcryptNativeBinding();
  const { AppModule } = require("../src/modules/app.module");

  const testingModuleBuilder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue({
      $connect: async () => undefined,
      $disconnect: async () => undefined,
      $on: () => undefined,
    } satisfies Partial<PrismaService>);

  for (const token of REPOSITORY_PROVIDER_TOKENS) {
    testingModuleBuilder.overrideProvider(token).useValue({});
  }

  const moduleRef = await testingModuleBuilder.compile();

  const app = moduleRef.createNestApplication({ logger: false });

  try {
    app.setGlobalPrefix(API_PREFIX, {
      exclude: [{ path: "health", method: RequestMethod.GET }],
    });

    await app.init();

    const document = createOpenApiDocument(app);
    writeCanonicalOpenApiDocument(document, OPENAPI_OUTPUT_PATH);

    console.log(`OpenAPI generated at ${OPENAPI_OUTPUT_PATH}`);
  } finally {
    await app.close();
  }
}

generateOpenApi().catch((error) => {
  console.error("Failed to generate OpenAPI", error);
  process.exit(1);
});
