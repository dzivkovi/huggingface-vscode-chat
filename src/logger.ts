import * as vscode from 'vscode';

class Logger {
    private outputChannel: vscode.OutputChannel;
    private startTime: number;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Hugging Face Chat Provider');
        this.startTime = Date.now();
    }

    private formatMessage(level: string, message: string, data?: unknown): string {
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(3);
        const timestamp = new Date().toISOString();
        let formattedMessage = `[${timestamp}] [${elapsed}s] [${level}] ${message}`;

        if (data !== undefined) {
            try {
                const dataStr = typeof data === 'string'
                    ? data
                    : JSON.stringify(data, null, 2);
                formattedMessage += `\n${dataStr}`;
            } catch (e) {
                formattedMessage += `\n[Unable to stringify data: ${e}]`;
            }
        }

        return formattedMessage;
    }

    info(message: string, data?: unknown): void {
        const formatted = this.formatMessage('INFO', message, data);
        this.outputChannel.appendLine(formatted);
        console.log(formatted);
    }

    error(message: string, data?: unknown): void {
        const formatted = this.formatMessage('ERROR', message, data);
        this.outputChannel.appendLine(formatted);
        console.error(formatted);
    }

    warn(message: string, data?: unknown): void {
        const formatted = this.formatMessage('WARN', message, data);
        this.outputChannel.appendLine(formatted);
        console.warn(formatted);
    }

    debug(message: string, data?: unknown): void {
        const formatted = this.formatMessage('DEBUG', message, data);
        this.outputChannel.appendLine(formatted);
        console.log(formatted);
    }

    show(): void {
        this.outputChannel.show();
    }

    dispose(): void {
        this.outputChannel.dispose();
    }
}

// Export singleton instance
export const logger = new Logger();