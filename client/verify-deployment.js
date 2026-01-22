#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Run this to verify your deployment configuration
 */

console.log("🔍 SmartCollege Deployment Verification\n");
console.log("=".repeat(50));

// Check if we're in the client directory
const fs = require("fs");
const path = require("path");

const requiredFiles = [
  ".env.example",
  ".env.production",
  "netlify.toml",
  "vite.config.ts",
  "src/lib/queryClient.ts",
];

console.log("\n📁 Checking required files...");
let allFilesExist = true;

requiredFiles.forEach((file) => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? "✅" : "❌"} ${file}`);
  if (!exists) allFilesExist = false;
});

// Check .env.production content
console.log("\n🔧 Checking .env.production configuration...");
if (fs.existsSync(".env.production")) {
  const envContent = fs.readFileSync(".env.production", "utf8");
  const hasApiUrl = envContent.includes("VITE_API_URL=");
  const hasRenderUrl = envContent.includes(".onrender.com");
  const hasTrailingSlash = envContent.match(/VITE_API_URL=.*\/\s*$/m);

  if (hasApiUrl) {
    console.log("  ✅ VITE_API_URL is defined");

    if (hasRenderUrl) {
      console.log("  ✅ Points to Render (.onrender.com)");
    } else {
      console.log("  ⚠️  URL might not be pointing to Render");
      console.log("     Expected format: https://your-app.onrender.com");
    }

    if (hasTrailingSlash) {
      console.log("  ❌ VITE_API_URL has trailing slash (remove it!)");
    } else {
      console.log("  ✅ No trailing slash (correct)");
    }
  } else {
    console.log("  ❌ VITE_API_URL not found");
  }
} else {
  console.log("  ❌ .env.production file missing");
}

// Check for hardcoded fetch calls
console.log("\n🔎 Checking for hardcoded API calls...");
const checkFile = (filePath) => {
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf8");
  const hardcodedFetch = content.match(/fetch\s*\(\s*['"]\s*\/api\//g);

  return hardcodedFetch ? hardcodedFetch.length : 0;
};

const filesToCheck = [
  "src/components/attendance/attendance-manager.tsx",
  "src/components/timetable/timetable-display.tsx",
  "src/pages/profile.tsx",
  "src/pages/preferences.tsx",
];

let totalHardcoded = 0;
filesToCheck.forEach((file) => {
  const count = checkFile(file);
  if (count !== null) {
    if (count > 0) {
      console.log(`  ❌ ${file}: ${count} hardcoded calls found`);
      totalHardcoded += count;
    } else {
      console.log(`  ✅ ${file}: No hardcoded calls`);
    }
  }
});

if (totalHardcoded === 0) {
  console.log("\n✅ No hardcoded API calls found!");
} else {
  console.log(
    `\n❌ Found ${totalHardcoded} hardcoded API calls that need fixing`,
  );
}

// Summary
console.log("\n" + "=".repeat(50));
console.log("\n📋 Next Steps:");
console.log("\n1. Update .env.production with your Render backend URL");
console.log("2. Set VITE_API_URL in Netlify environment variables:");
console.log("   - Go to: Site settings > Environment variables");
console.log("   - Add: VITE_API_URL = https://your-app.onrender.com");
console.log("3. Commit and push changes to trigger rebuild");
console.log("4. Check browser DevTools > Network to verify API calls");
console.log("\n💡 See DEPLOYMENT_FIX.md for detailed instructions\n");
