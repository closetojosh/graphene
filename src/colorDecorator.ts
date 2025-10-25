import * as vscode from 'vscode';
import { graphiteLog, gitBlame } from './utils/cliUtils';
import { parseGraphiteLog, parseGitBlame } from './utils/parserUtils';

// Track if colors are currently enabled
let colorsEnabled = false;
let decorationTypes: vscode.TextEditorDecorationType[] = [];

// Fixed color palette with 20 bright colors for testing
const COLOR_PALETTE = [
	'hsl(0, 70%, 20%)',    // Dark red
	'hsl(15, 70%, 20%)',   // Dark orange
	'hsl(30, 70%, 20%)',   // Dark yellow-orange
	'hsl(45, 70%, 20%)',   // Dark yellow
	'hsl(60, 70%, 20%)',   // Dark lime
	'hsl(75, 70%, 20%)',   // Dark green
	'hsl(90, 70%, 20%)',   // Dark mint
	'hsl(105, 70%, 20%)',  // Dark green-blue
	'hsl(120, 70%, 20%)',  // Dark cyan
	'hsl(135, 70%, 20%)',  // Dark teal
	'hsl(150, 70%, 20%)',  // Dark blue-green
	'hsl(165, 70%, 20%)',  // Dark aqua
	'hsl(180, 70%, 20%)',  // Dark blue
	'hsl(195, 70%, 20%)',  // Dark sky blue
	'hsl(210, 70%, 20%)',  // Dark periwinkle
	'hsl(225, 70%, 20%)',  // Dark lavender
	'hsl(240, 70%, 20%)',  // Dark purple
	'hsl(255, 70%, 20%)',  // Dark violet
	'hsl(270, 70%, 20%)',  // Dark magenta
	'hsl(285, 70%, 20%)'   // Dark pink
];

// Hash a string to a number for color generation (fallback)
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs(hash);
}

// Get color for a branch name using the fixed palette
function getBranchColor(branchName: string): string {
	const hash = hashString(branchName);
	return COLOR_PALETTE[hash % COLOR_PALETTE.length];
}

// Apply colors to current editor using Graphite PR data
async function applyColors(editor: vscode.TextEditor) {
	// Clear existing decorations
	decorationTypes.forEach(type => type.dispose());
	decorationTypes = [];

	const document = editor.document;
	const decorations: Map<string, vscode.Range[]> = new Map();

	try {
		// Get the workspace folder for the current document
		let workspacePath: string;
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
		
		if (workspaceFolder) {
			workspacePath = workspaceFolder.uri.fsPath;
		} else {
			// Fallback: try to find git root from the document's directory
			const documentDir = require('path').dirname(document.fileName);
			workspacePath = documentDir;
			console.log(`No workspace folder found, using document directory: ${workspacePath}`);
		}

		console.log(`Using workspace path: ${workspacePath}`);
		console.log(`Document file name: ${document.fileName}`);

		// Get Graphite log data
		const graphiteOutput = graphiteLog(workspacePath);
		const branchToCommits = parseGraphiteLog(graphiteOutput);

		// Get git blame data for the current file
		const blameOutput = gitBlame(document.fileName, workspacePath);
		const lineToCommit = parseGitBlame(blameOutput);
		
		console.log('Git blame output sample:', blameOutput.split('\n').slice(0, 5));
		console.log('Line to commit mapping sample:', lineToCommit.slice(0, 10));
		console.log('Total lines with commit data:', lineToCommit.filter(c => c).length);

		// Map commits to branches
		const commitToBranch: { [commitHash: string]: string } = {};
		Object.entries(branchToCommits).forEach(([branchName, commits]) => {
			commits.forEach(commit => {
				commitToBranch[commit] = branchName;
			});
		});
		
		console.log('Commit to branch mapping:', commitToBranch);

		// Apply colors based on branch for each line
		const content = document.getText();
		const lines = content.split('\n');

		let linesWithMatches = 0;
		for (let i = 0; i < lines.length; i++) {
			const commitHash = lineToCommit[i];
			if (commitHash) {
				// Try exact match first
				let branchName = commitToBranch[commitHash];
				
				// If no exact match, try matching by first 7 characters (Graphite uses shorter hashes)
				if (!branchName && commitHash.length >= 7) {
					const shortHash = commitHash.substring(0, 7);
					branchName = commitToBranch[shortHash];
				}
				
				if (branchName) {
					linesWithMatches++;
					const color = getBranchColor(branchName);

					// Get or create decoration type for this color
					if (!decorations.has(color)) {
						decorations.set(color, []);
						const decorationType = vscode.window.createTextEditorDecorationType({
							backgroundColor: color
						});
						decorationTypes.push(decorationType);
					}

					// Add this line's range to the decoration
					const range = new vscode.Range(i, 0, i, lines[i].length);
					decorations.get(color)!.push(range);
				}
			}
		}
		
		console.log(`Lines with matching commits: ${linesWithMatches}`);

		// Apply all decorations
		let decorationIndex = 0;
		decorations.forEach((ranges, color) => {
			if (decorationIndex < decorationTypes.length) {
				editor.setDecorations(decorationTypes[decorationIndex], ranges);
				decorationIndex++;
			}
		});

		console.log(`Applied colors for ${Object.keys(branchToCommits).length} branches`);
		console.log('Branch to commits mapping:', branchToCommits);
		console.log('Decoration types created:', decorationTypes.length);
		console.log('Total decorations applied:', decorations.size);
	} catch (error) {
		console.warn('Failed to get Graphite data, falling back to line-based coloring:', error);
		
		// Fallback to line-content hashing
		const content = document.getText();
		const lines = content.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const hash = hashString(line);
			const color = COLOR_PALETTE[hash % COLOR_PALETTE.length];

			// Get or create decoration type for this color
			if (!decorations.has(color)) {
				decorations.set(color, []);
				const decorationType = vscode.window.createTextEditorDecorationType({
					backgroundColor: color
				});
				decorationTypes.push(decorationType);
			}

			// Add this line's range to the decoration
			const range = new vscode.Range(i, 0, i, line.length);
			decorations.get(color)!.push(range);
		}

		// Apply all decorations
		let decorationIndex = 0;
		decorations.forEach((ranges, color) => {
			if (decorationIndex < decorationTypes.length) {
				editor.setDecorations(decorationTypes[decorationIndex], ranges);
				decorationIndex++;
			}
		});

		vscode.window.showWarningMessage('Graphite data unavailable, using line-based coloring instead');
	}
}

export function toggleColors(editor: vscode.TextEditor | undefined, statusBarItem: vscode.StatusBarItem): void {
	if (!editor) {
		vscode.window.showWarningMessage('No active editor found');
		return;
	}

	colorsEnabled = !colorsEnabled;

	if (colorsEnabled) {
		statusBarItem.text = "$(gear) Colors: On";
		applyColors(editor);
	} else {
		statusBarItem.text = "$(gear) Toggle Colors";
		decorationTypes.forEach(type => type.dispose());
		decorationTypes = [];
	}

	vscode.window.showInformationMessage(`Colors ${colorsEnabled ? 'enabled' : 'disabled'}`);
}
