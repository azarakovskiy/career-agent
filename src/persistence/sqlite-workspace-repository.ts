import Database from "better-sqlite3";
import type {
	EvidenceItem,
	Workspace,
	WorkspaceSnapshot,
} from "../domain/evidence.js";
import type {
	CurrentProfileSnapshot,
	ProfileExtraction,
} from "../domain/profile.js";
import type { ProfileRepository } from "./profile-repository.js";
import { applyMigrations } from "./migration-runner.js";
import { SqliteProfileStore } from "./sqlite-profile-store.js";
import { SqliteWorkspaceStore } from "./sqlite-workspace-store.js";
import type { WorkspaceRepository } from "./workspace-repository.js";

export class SqliteWorkspaceRepository
	implements WorkspaceRepository, ProfileRepository
{
	private readonly database: Database;
	private readonly workspaceRepository: SqliteWorkspaceStore;
	private readonly profileRepository: SqliteProfileStore;

	constructor(databasePath: string) {
		this.database = new Database(databasePath);
		this.database.pragma("foreign_keys = ON");
		applyMigrations(this.database);
		this.workspaceRepository = new SqliteWorkspaceStore(this.database);
		this.profileRepository = new SqliteProfileStore(
			this.database,
			this.workspaceRepository.getWorkspace().id,
		);
	}

	getWorkspace(): Workspace {
		return this.workspaceRepository.getWorkspace();
	}

	recordSubmission(content: string): EvidenceItem {
		return this.workspaceRepository.recordSubmission(content);
	}

	readSnapshot(): WorkspaceSnapshot {
		return this.workspaceRepository.readSnapshot();
	}

	recordProfileDerivation(
		evidenceId: string,
		extraction: ProfileExtraction,
	): CurrentProfileSnapshot {
		return this.profileRepository.recordProfileDerivation(
			evidenceId,
			extraction,
		);
	}

	readCurrentProfile(): CurrentProfileSnapshot {
		return this.profileRepository.readCurrentProfile();
	}

	close(): void {
		this.database.close();
	}
}
