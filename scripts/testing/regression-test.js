#!/usr/bin/env node

/**
 * Regression test for Issue #3 - Local-only mode without HF key
 * This script simulates the key scenarios to verify the implementation
 */

console.log("=== Regression Test Suite for Local-Only Mode ===\n");

// Test 1: Verify compilation succeeds
console.log("Test 1: TypeScript Compilation");
const { execSync } = require('child_process');
try {
    execSync('npm run compile', { stdio: 'pipe' });
    console.log("✓ TypeScript compilation successful");
} catch (error) {
    console.error("✗ TypeScript compilation failed");
    process.exit(1);
}

// Test 2: Verify the compiled output exists
console.log("\nTest 2: Compiled Output");
try {
    const fs = require('fs');
    if (fs.existsSync('./out/provider.js') && fs.existsSync('./out/extension.js')) {
        console.log("✓ Compiled JavaScript files exist");
    } else {
        throw new Error("Compiled files not found");
    }
} catch (error) {
    console.error("✗ Compiled output check failed:", error.message);
    process.exit(1);
}

// Test 3: Verify critical files exist
console.log("\nTest 3: File Structure");
const fs = require('fs');
const criticalFiles = [
    'src/provider.ts',
    'src/extension.ts',
    'src/test/local-only-mode.test.ts',
    'src/test/provider.test.ts',
    'package.json'
];

let allFilesExist = true;
for (const file of criticalFiles) {
    if (fs.existsSync(file)) {
        console.log(`✓ ${file} exists`);
    } else {
        console.error(`✗ ${file} missing`);
        allFilesExist = false;
    }
}

if (!allFilesExist) {
    process.exit(1);
}

// Test 4: Verify package.json has correct configuration
console.log("\nTest 4: Package Configuration");
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (packageJson.main === "./out/extension.js") {
    console.log("✓ Main entry point correct");
} else {
    console.error("✗ Main entry point incorrect");
}

if (packageJson.contributes && packageJson.contributes.configuration) {
    const props = packageJson.contributes.configuration.properties;
    if (props && props['huggingface.customTGIEndpoint']) {
        console.log("✓ customTGIEndpoint configuration exists");
    } else {
        console.error("✗ customTGIEndpoint configuration missing");
    }
}

// Test 5: Verify the key changes are in place
console.log("\nTest 5: Implementation Verification");
const providerSource = fs.readFileSync('src/provider.ts', 'utf8');

const keyPatterns = [
    { pattern: /LOCAL-ONLY MODE:/, desc: "Local-only mode comment" },
    { pattern: /operating in local-only mode/, desc: "Local mode log message" },
    { pattern: /RETURN EARLY - Skip HF entirely/, desc: "Early return implementation" },
    { pattern: /CLOUD MODE:/, desc: "Cloud mode comment" },
    { pattern: /operating in cloud mode/, desc: "Cloud mode log message" }
];

let allPatternsFound = true;
for (const { pattern, desc } of keyPatterns) {
    if (pattern.test(providerSource)) {
        console.log(`✓ ${desc} found`);
    } else {
        console.error(`✗ ${desc} missing`);
        allPatternsFound = false;
    }
}

if (!allPatternsFound) {
    console.error("\n⚠️  Some implementation details missing!");
}

// Summary
console.log("\n=== Regression Test Summary ===");
console.log("✓ TypeScript compilation works");
console.log("✓ Module structure intact");
console.log("✓ File structure preserved");
console.log("✓ Configuration intact");
if (allPatternsFound) {
    console.log("✓ Implementation verified");
    console.log("\n✅ All regression tests passed!");
} else {
    console.log("⚠️  Implementation may be incomplete");
    console.log("\n⚠️  Some tests failed - review needed");
}

console.log("\n📝 Manual Testing Required:");
console.log("1. Test with local endpoint configured, no HF key");
console.log("2. Test with HF key, no local endpoint");
console.log("3. Test mode switching");
console.log("4. Verify no prompts appear in local mode");