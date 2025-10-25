/**
 * Parse the output from `gt log` command into a structured object
 * @param output The raw output from `gt log --no-interactive`
 * @returns Object mapping branch names to arrays of commit hashes
 */
export function parseGraphiteLog(output: string): { [branchName: string]: string[] } {
	const result: { [branchName: string]: string[] } = {};
	
	if (!output || output.trim() === '') {
		return result;
	}

	const lines = output.split('\n');
	let currentBranch = '';
	
	for (const line of lines) {
		const trimmedLine = line.trim();
		
		// Branch lines start with ◉ or ◯
		if (trimmedLine.startsWith('◉') || trimmedLine.startsWith('◯')) {
			// Extract branch name (everything after ◉/◯ until the first space or parenthesis)
			const branchMatch = trimmedLine.match(/[◉◯]\s*([^\s(]+)/);
			if (branchMatch) {
				currentBranch = branchMatch[1];
				if (!result[currentBranch]) {
					result[currentBranch] = [];
				}
			}
		}
		// Commit lines start with │ and contain a commit hash
		else if (trimmedLine.startsWith('│') && currentBranch) {
			// Extract commit hash (7+ character hex string)
			const commitMatch = trimmedLine.match(/│\s*([a-f0-9]{7,})/);
			if (commitMatch) {
				const commitHash = commitMatch[1];
				result[currentBranch].push(commitHash);
			}
		}
	}
	
	return result;
}

/**
 * Parse the output from `git blame --porcelain` command to map line numbers to commit hashes
 * @param output The raw output from `git blame --porcelain <file>`
 * @returns Array where index is line number (0-based) and value is commit hash
 */
export function parseGitBlame(output: string): string[] {
	const result: string[] = [];
	
	if (!output || output.trim() === '') {
		return result;
	}

	const lines = output.split('\n');
	let currentCommit = '';
	let lineNumber = 0;
	
	for (const line of lines) {
		// Porcelain format has commit hash on first line of each block
		// Format: <commit_hash> <line_number> <line_number> <line_count>
		const commitMatch = line.match(/^([a-f0-9]{7,})\s+\d+\s+\d+\s+\d+$/);
		if (commitMatch) {
			currentCommit = commitMatch[1];
			continue;
		}
		
		// Content lines start with a tab
		if (line.startsWith('\t')) {
			result[lineNumber] = currentCommit;
			lineNumber++;
		}
	}
	
	return result;
}
