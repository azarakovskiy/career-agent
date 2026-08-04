import type {
	CurrentProfileSnapshot,
	ProfileExtraction,
} from "../domain/profile.js";

export interface ProfileRepository {
	recordProfileDerivation(
		evidenceId: string,
		extraction: ProfileExtraction,
	): CurrentProfileSnapshot;
	readCurrentProfile(): CurrentProfileSnapshot;
}
