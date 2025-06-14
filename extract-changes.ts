import { Command } from 'commander';
import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .option('--jira <id>', 'JIRA ID to search in commits')
  .option('--from <date>', 'Start date (YYYY-MM-DD)')
  .option('--to <date>', 'End date (YYYY-MM-DD)')
  .parse(process.argv);

const opts = program.opts();
const jira = opts.jira;
const from = opts.from;
const to = opts.to;

if (!jira && (!from || !to)) {
  console.error('❌ Please provide either --jira or both --from and --to');
  process.exit(1);
}

async function extractChanges(repoPath: string, label: string) {
  const git = simpleGit(repoPath);
  const range = jira
    ? [`--grep=${jira}`, '--name-only']
    : [`--since=${from}`, `--until=${to}`, '--name-only'];
  const log = await git.raw(['log', ...range, '--pretty=format:']);

  const files = Array.from(new Set(log.trim().split('\n').filter(f => f.trim())));
  return files;
}

(async () => {
  const frontendPath = path.resolve('../frontend');
  const backendPath = path.resolve('../backend');

  const frontendFiles = await extractChanges(frontendPath, 'frontend');
  const backendFiles = await extractChanges(backendPath, 'backend');

  const result = {
    jira: jira || `${from} to ${to}`,
    frontend: frontendFiles,
    backend: backendFiles,
  };

  fs.writeFileSync('changes.json', JSON.stringify(result, null, 2));
  console.log('✅ Saved to changes.json');
})();
