# Environment Checklist

Before running the Shopify A11y Sales Audit tool, verify that your local environment meets these prerequisites.

---

## Prerequisites

### 1. Node.js LTS

**Required:** Node.js v18.x or v20.x (LTS versions recommended)

**Verification:**

```bash
node --version
# Should output: v18.x.x or v20.x.x
```

**Installation:**

- Download from [nodejs.org](https://nodejs.org/)
- Or use a version manager like [nvm](https://github.com/nvm-sh/nvm)

---

### 2. VS Code

**Required:** Visual Studio Code (latest stable version)

**Verification:**

```bash
code --version
# Should output version info
```

**Installation:**

- Download from [code.visualstudio.com](https://code.visualstudio.com/)

---

### 3. Playwright VS Code Extension

**Required:** Playwright Test for VS Code extension

**Verification:**

1. Open VS Code
2. Go to Extensions (`Cmd+Shift+X` on macOS)
3. Search for "Playwright Test for VSCode"
4. Verify it's installed (should show "Installed" or a gear icon)

**Installation:**

- Install from VS Code Extensions marketplace
- Extension ID: `ms-playwright.playwright`

---

### 4. Playwright MCP Server (Optional)

**Optional but recommended** for agent/automation workflows

**Verification:**

```bash
# Check if MCP config exists after setup
ls -la .mcp/playwright.json
```

**Installation:**

- Will be configured in Step 3 of the implementation plan
- Enables Model Context Protocol integration

---

## Quick Verification Script

Run all checks at once:

```bash
echo "Node.js:" && node --version
echo "npm:" && npm --version
echo "VS Code:" && code --version
```

Expected output should show versions for all three tools.

---

## Environment Ready ✓

Once all prerequisites are verified:

- ✓ Node.js LTS installed
- ✓ VS Code installed
- ✓ Playwright VS Code extension installed
- ✓ (Optional) Ready to configure Playwright MCP

You're ready to proceed to **Step 1 — Repository bootstrap**!
