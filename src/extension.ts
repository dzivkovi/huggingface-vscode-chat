import * as vscode from "vscode";
import { HuggingFaceChatModelProvider } from "./provider";
import { logger } from "./logger";

export function activate(context: vscode.ExtensionContext) {
	// Initialize logging
	logger.info("vLLM + HuggingFace Bridge extension activating...");

	// Build a descriptive User-Agent to help quantify API usage
	const ext = vscode.extensions.getExtension("vllm-community.vllm-huggingface-bridge");
	const extVersion = ext?.packageJSON?.version ?? "unknown";
	const vscodeVersion = vscode.version;
	// Keep UA minimal: only extension version and VS Code version
	const ua = `vllm-huggingface-bridge/${extVersion} VSCode/${vscodeVersion}`;

	logger.info(`Extension version: ${extVersion}, VS Code version: ${vscodeVersion}`);

	const provider = new HuggingFaceChatModelProvider(context.secrets, ua);
	// Register the provider under the vendor id used in package.json
	vscode.lm.registerLanguageModelChatProvider("vllm-bridge", provider);
	logger.info("vLLM + HuggingFace Bridge registered successfully");

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

	logger.info('vLLM + HuggingFace Bridge extension activated successfully');
}

export function deactivate() {
	logger.info('vLLM + HuggingFace Bridge extension deactivating...');
	logger.dispose();
}
