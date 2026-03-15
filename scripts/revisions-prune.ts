import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_RETENTION_COUNT = 100;

function parseRetentionCount(value: string | undefined): number {
  if (!value) return DEFAULT_RETENTION_COUNT;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_RETENTION_COUNT;
  }
  return Math.trunc(parsed);
}

async function prunePageRevisions(retentionCount: number): Promise<number> {
  const pages = await prisma.page.findMany({ select: { id: true } });
  let deleted = 0;

  for (const page of pages) {
    const stale = await prisma.pageRevision.findMany({
      where: { pageId: page.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: retentionCount,
      select: { id: true },
    });

    if (stale.length === 0) continue;

    const result = await prisma.pageRevision.deleteMany({
      where: { id: { in: stale.map((revision) => revision.id) } },
    });
    deleted += result.count;
  }

  return deleted;
}

async function pruneContentItemRevisions(
  retentionCount: number,
): Promise<number> {
  const items = await prisma.contentItem.findMany({ select: { id: true } });
  let deleted = 0;

  for (const item of items) {
    const stale = await prisma.contentItemRevision.findMany({
      where: { contentItemId: item.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: retentionCount,
      select: { id: true },
    });

    if (stale.length === 0) continue;

    const result = await prisma.contentItemRevision.deleteMany({
      where: { id: { in: stale.map((revision) => revision.id) } },
    });
    deleted += result.count;
  }

  return deleted;
}

async function main() {
  const retentionCount = parseRetentionCount(
    process.env.REVISION_RETENTION_COUNT,
  );

  const deletedPageRevisions = await prunePageRevisions(retentionCount);
  const deletedContentItemRevisions =
    await pruneContentItemRevisions(retentionCount);

  console.log(
    JSON.stringify(
      {
        retentionCount,
        deletedPageRevisions,
        deletedContentItemRevisions,
        deletedTotal: deletedPageRevisions + deletedContentItemRevisions,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Failed to prune revisions", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
