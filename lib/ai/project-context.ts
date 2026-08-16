import { promises as fs } from "node:fs";
import path from "node:path";

const ignored = new Set([
  "node_modules",
  ".next",
  ".git",
  "coverage",
  ".envrc",
  ".claude",
]);
const allowed = new Set([".ts", ".tsx", ".css", ".md", ".json"]);

async function collectFiles(directory: string, files: string[] = []) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name) || entry.name.startsWith(".env")) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectFiles(fullPath, files);
    else if (
      allowed.has(path.extname(entry.name)) &&
      !entry.name.endsWith(".lock")
    )
      files.push(fullPath);
  }
  return files;
}

export async function getProjectContext() {
  const root = process.cwd();
  const files = await collectFiles(root);
  const sections: string[] = [];
  let size = 0;
  for (const file of files.sort()) {
    const relative = path.relative(root, file);
    let content: string;
    try {
      content = await fs.readFile(file, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    if (size + content.length > 120_000) continue;
    sections.push(`\n--- ${relative} ---\n${content}`);
    size += content.length;
  }
  return sections.join("\n");
}
