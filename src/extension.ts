import * as vscode from "vscode";
import { HuggingFaceChatModelProvider } from "./provider";
import { logger } from "./logger";

export function activate(context: vscode.ExtensionContext) {
	// Initialize logging
	logger.info("Hugging Face Chat Provider extension activating...");

	// Build a descriptive User-Agent to help quantify API usage
	const ext = vscode.extensions.getExtension("HuggingFace.huggingface-vscode-chat");
	const extVersion = ext?.packageJSON?.version ?? "unknown";
	const vscodeVersion = vscode.version;
	// Keep UA minimal: only extension version and VS Code version
	const ua = `huggingface-vscode-chat/${extVersion} VSCode/${vscodeVersion}`;

	logger.info(`Extension version: ${extVersion}, VS Code version: ${vscodeVersion}`);

	const provider = new HuggingFaceChatModelProvider(context.secrets, ua);
	// Register the Hugging Face provider under the vendor id used in package.json
	vscode.lm.registerLanguageModelChatProvider("huggingface", provider);
	logger.info("Hugging Face Chat Provider registered successfully");

	// Listen for configuration changes to update local inference endpoint
	// Note: Configuration key name remains 'customTGIEndpoint' for backward compatibility
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('huggingface.customTGIEndpoint')) {
				const newEndpoint = vscode.workspace.getConfiguration('huggingface').get<string>('customTGIEndpoint');
				logger.info(`Local inference endpoint configuration changed to: ${newEndpoint}`);
				// Provider will reload local endpoint in its constructor
				// For now, user needs to reload window for changes to take effect
				vscode.window.showInformationMessage(
					'Local inference endpoint configuration changed. Please reload the window for changes to take effect.',
					'Reload'
				).then(selection => {
					if (selection === 'Reload') {
						logger.info('User requested window reload');
						vscode.commands.executeCommand('workbench.action.reloadWindow');
					}
				});
			}
		})
	);

	// Management command to configure API key
	context.subscriptions.push(
		vscode.commands.registerCommand("huggingface.manage", async () => {
			logger.info('API key management command invoked');
			const existing = await context.secrets.get("huggingface.apiKey");
			const apiKey = await vscode.window.showInputBox({
				title: "Hugging Face API Key",
				prompt: existing ? "Update your Hugging Face API key" : "Enter your Hugging Face API key",
				ignoreFocusOut: true,
				password: true,
				value: existing ?? "",
			});
			if (apiKey === undefined) {
				logger.info('API key management canceled by user');
				return; // user canceled
			}
			if (!apiKey.trim()) {
				await context.secrets.delete("huggingface.apiKey");
				logger.info('API key cleared');
				vscode.window.showInformationMessage("Hugging Face API key cleared.");
				return;
			}
			await context.secrets.store("huggingface.apiKey", apiKey.trim());
			logger.info('API key saved successfully');
			vscode.window.showInformationMessage("Hugging Face API key saved.");
		})
	);

	// Add logger to subscriptions so it gets disposed properly
	context.subscriptions.push({ dispose: () => logger.dispose() });

	logger.info('Hugging Face Chat Provider extension activated successfully');
}

export function deactivate() {
	logger.info('Hugging Face Chat Provider extension deactivating...');
	logger.dispose();
}
