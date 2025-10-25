import * as vscode from 'vscode';

// Track if colors are currently enabled
let colorsEnabled = false;
let decorationTypes: vscode.TextEditorDecorationType[] = [];

// Hash a string to a number for color generation
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs(hash);
}

// Generate a color from a hash
function hashToColor(hash: number): string {
	const hue = hash % 360;
	return `hsl(${hue}, 70%, 90%)`;
}

// Apply colors to current editor
async function applyColors(editor: vscode.TextEditor) {
	// Clear existing decorations
	decorationTypes.forEach(type => type.dispose());
	decorationTypes = [];

	const document = editor.document;
	const decorations: Map<string, vscode.Range[]> = new Map();

	// Get git blame or use content hash as fallback
	const content = document.getText();
	const lines = content.split('\n');

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		// Hash the line content (in real implementation, use git commit hash)
		const hash = hashString(line);
		const color = hashToColor(hash);

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
