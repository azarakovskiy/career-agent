import type {
	EvidenceItem,
	Workspace,
	WorkspaceSnapshot,
} from "../domain/evidence.js";

export interface WorkspaceRepository {
	getWorkspace(): Workspace;
	recordSubmission(content: string): EvidenceItem;
	readSnapshot(): WorkspaceSnapshot;
	close(): void;
}
