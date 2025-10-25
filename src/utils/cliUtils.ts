import { execSync } from 'child_process';
import * as vscode from 'vscode';

/**
 * Execute `gt log --no-interactive` and return the output as a string
 * @param workspaceFolder The workspace folder to run the command in
 * @returns The stdout from the gt log command
 * @throws Error if the command fails or gt is not installed
 */
export function graphiteLog(workspaceFolder: string): string {
	try {
		const output = execSync('gt log --no-interactive', { 
			encoding: 'utf8',
			cwd: workspaceFolder,
			timeout: 10000 // 10 second timeout
		});
		return output;
	} catch (error) {
		// Re-throw with more context
		if (error instanceof Error) {
			if (error.message.includes('command not found') || error.message.includes('ENOENT')) {
				throw new Error('Graphite CLI (gt) not found. Please install Graphite first.');
			}
			if (error.message.includes('not a git repository')) {
				throw new Error('Not in a git repository. Graphite requires a git repository.');
			}
			throw new Error(`Graphite command failed: ${error.message}`);
			}
		throw new Error('Unknown error executing Graphite command');
	}
}

/**
 * Execute `git blame` on a file and return the output
 * @param filePath The path to the file to blame
 * @param workspaceFolder The workspace folder to run the command in
 * @returns The stdout from the git blame command
 * @throws Error if the command fails or not in a git repo
 */
export function gitBlame(filePath: string, workspaceFolder: string): string {
	try {
		const output = execSync(`git blame --porcelain "${filePath}"`, { 
			encoding: 'utf8',
			cwd: workspaceFolder,
			timeout: 10000 // 10 second timeout
		});
		return output;
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes('command not found') || error.message.includes('ENOENT')) {
				throw new Error('Git not found. Please install Git first.');
			}
			if (error.message.includes('not a git repository')) {
				throw new Error('Not in a git repository.');
			}
			throw new Error(`Git blame command failed: ${error.message}`);
		}
		throw new Error('Unknown error executing git blame command');
	}
}
