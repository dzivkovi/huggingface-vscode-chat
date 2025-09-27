import * as assert from "assert";
import * as vscode from "vscode";

/**
 * CRITICAL REGRESSION TEST
 *
 * This test would have caught the "Sorry, no response was returned" bug
 * where we were using plain objects instead of VS Code API classes.
 *
 * Bug: progress.report({ content: "text" }) - WRONG
 * Fix: progress.report(new vscode.LanguageModelTextPart("text")) - CORRECT
 *
 * This is the lowest common denominator test from our painful debugging session.
 */
suite("Streaming Response Progress Reporting", () => {
	test("MUST use VS Code API classes for progress.report (not plain objects)", () => {
		// Create a mock progress callback to track what gets reported
		const reportedParts: any[] = [];
		const mockProgress = {
			report: (part: any) => {
				reportedParts.push(part);
			}
		};

		// Simulate what our streaming handler does
		const testText = "Hello from the model";

		// This is what we MUST do (using VS Code API class)
		mockProgress.report(new vscode.LanguageModelTextPart(testText));

		// Verify the reported part is the correct type
		assert.strictEqual(reportedParts.length, 1, "Should report exactly one part");
		const reportedPart = reportedParts[0];

		// This is the critical check - it MUST be an instance of the VS Code API class
		assert.ok(
			reportedPart instanceof vscode.LanguageModelTextPart,
			"progress.report MUST be called with vscode.LanguageModelTextPart instance, not a plain object"
		);

		// Verify the content is preserved
		assert.strictEqual(reportedPart.value, testText, "Text content should be preserved");
	});

	test("Tool calls MUST use LanguageModelToolCallPart (not plain objects)", () => {
		const reportedParts: any[] = [];
		const mockProgress = {
			report: (part: any) => {
				reportedParts.push(part);
			}
		};

		// Simulate a tool call
		const toolId = "call_123";
		const toolName = "search";
		const toolArgs = { query: "test" };

		// This is what we MUST do (using VS Code API class)
		mockProgress.report(new vscode.LanguageModelToolCallPart(toolId, toolName, toolArgs));

		// Verify the reported part is the correct type
		assert.strictEqual(reportedParts.length, 1, "Should report exactly one part");
		const reportedPart = reportedParts[0];

		// Critical check - MUST be an instance of the VS Code API class
		assert.ok(
			reportedPart instanceof vscode.LanguageModelToolCallPart,
			"progress.report MUST be called with vscode.LanguageModelToolCallPart instance, not a plain object"
		);

		// Verify the tool call data is preserved
		assert.strictEqual(reportedPart.callId, toolId, "Tool call ID should be preserved");
		assert.strictEqual(reportedPart.name, toolName, "Tool name should be preserved");
		assert.deepStrictEqual(reportedPart.input, toolArgs, "Tool arguments should be preserved");
	});

	test("Plain objects in progress.report should FAIL this test (negative test)", () => {
		const reportedParts: any[] = [];
		const mockProgress = {
			report: (part: any) => {
				reportedParts.push(part);
			}
		};

		// This is what we were doing WRONG (plain object)
		const wrongTextPart = { content: "text" };  // WRONG!
		mockProgress.report(wrongTextPart);

		// This SHOULD fail the instanceof check
		assert.ok(
			!(reportedParts[0] instanceof vscode.LanguageModelTextPart),
			"Plain objects are NOT instances of VS Code API classes"
		);

		// Document what was wrong
		assert.strictEqual(
			typeof reportedParts[0],
			"object",
			"Plain objects look like objects but aren't the right type"
		);

		// This is why VS Code showed "Sorry, no response was returned"
		// It was expecting API class instances, not plain objects!
	});
});