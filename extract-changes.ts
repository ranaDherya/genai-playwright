// Required Packages
// npm install axios dotenv simple-git

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import simpleGit from 'simple-git';

dotenv.config();

const JIRA_BASE = process.env.JIRA_BASE!;
const JIRA_EMAIL = process.env.JIRA_EMAIL!;
const JIRA_TOKEN = process.env.JIRA_TOKEN!;
const PROJECT_KEY = process.env.JIRA_PROJECT_KEY!;
const GIT_REPO_PATH = process.env.GIT_REPO_PATH || '.'; // default current dir

const AUTH_HEADER = {
  auth: {
    username: JIRA_EMAIL,
    password: JIRA_TOKEN
  },
  headers: {
    'Accept': 'application/json'
  }
};

const JIRA_TAG = `${PROJECT_KEY}-`;

const git = simpleGit(GIT_REPO_PATH);

interface StoryContext {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  filesChanged: string[];
}

async function getStoryIdsFromGit(): Promise<Record<string, string[]>> {
  const commits = await git.log();
  const storyCommits: Record<string, string[]> = {};

  for (const commit of commits.all) {
    const matches = commit.message.match(new RegExp(`${JIRA_TAG}[0-9]+`, 'g'));
    if (matches) {
      for (const match of matches) {
        if (!storyCommits[match]) storyCommits[match] = [];
        const diff = await git.show([`${commit.hash}`]);
        const changedFiles = diff
          .split('\n')
          .filter(line => line.startsWith('+++ b/') || line.startsWith('--- a/'))
          .map(line => line.replace(/^(\+\+\+ b\/|--- a\/)/, ''));
        storyCommits[match].push(...changedFiles);
      }
    }
  }

  return storyCommits;
}

async function getJiraStoryDetails(storyId: string): Promise<StoryContext | null> {
  try {
    const res = await axios.get(`${JIRA_BASE}/rest/api/3/issue/${storyId}`, AUTH_HEADER);
    const fields = res.data.fields;
    const ac = extractAcceptanceCriteria(fields);
    return {
      id: storyId,
      title: fields.summary,
      description: fields.description?.content?.[0]?.content?.[0]?.text || '',
      acceptanceCriteria: ac,
      filesChanged: [] // added later
    };
  } catch (err) {
    console.error(`❌ Failed to fetch ${storyId}`, err);
    return null;
  }
}

function extractAcceptanceCriteria(fields: any): string[] {
  const ac = fields.customfield_12345; // ⚠️ Replace with your actual field ID
  if (Array.isArray(ac)) return ac;
  if (typeof ac === 'string') return [ac];
  return [];
}

async function buildContext(): Promise<void> {
  const storyCommits = await getStoryIdsFromGit();
  const context: StoryContext[] = [];

  for (const [storyId, filesChanged] of Object.entries(storyCommits)) {
    const details = await getJiraStoryDetails(storyId);
    if (details) {
      details.filesChanged = Array.from(new Set(filesChanged));
      context.push(details);
    }
  }

  fs.writeFileSync('story_context.json', JSON.stringify(context, null, 2));
  console.log('✅ story_context.json created.');
}

buildContext();
