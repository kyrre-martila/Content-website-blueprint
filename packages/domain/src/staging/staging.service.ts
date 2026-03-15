import type {
  SiteEnvironmentName,
  SiteEnvironmentStatus,
} from "../content/content.entity";
import type { SiteEnvironmentStatusRepository } from "../content/content.repositories";

export class StagingService {
  constructor(
    private readonly statusRepository: SiteEnvironmentStatusRepository,
  ) {}

  async getStatus(
    environment: SiteEnvironmentName,
  ): Promise<SiteEnvironmentStatus | null> {
    return this.statusRepository.get(environment);
  }

  async listStatuses(): Promise<SiteEnvironmentStatus[]> {
    return this.statusRepository.list();
  }

  async resetFromLive(actorUserId?: string): Promise<SiteEnvironmentStatus> {
    return this.statusRepository.upsert({
      environment: "staging",
      state: "active",
      lastSyncedAt: new Date(),
      lastPushedAt: null,
      lastResetAt: new Date(),
      lockStatus: "idle",
      lastActorUserId: actorUserId ?? null,
    });
  }

  async pushToLive(actorUserId?: string): Promise<SiteEnvironmentStatus> {
    return this.statusRepository.upsert({
      environment: "staging",
      state: "active",
      lastSyncedAt: null,
      lastPushedAt: new Date(),
      lastResetAt: null,
      lockStatus: "idle",
      lastActorUserId: actorUserId ?? null,
    });
  }

  async deleteStaging(actorUserId?: string): Promise<SiteEnvironmentStatus> {
    return this.statusRepository.upsert({
      environment: "staging",
      state: "deleted",
      lastSyncedAt: null,
      lastPushedAt: null,
      lastResetAt: null,
      lockStatus: "idle",
      lastActorUserId: actorUserId ?? null,
    });
  }
}
