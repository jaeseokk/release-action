import {exec} from '../utils/exec';
import {GitTag, MergeCommitInfo, Package} from '../types';
import {dedup, filterExistingPackages} from '.';
import {MERGE_PULL_COMMIT_REGEX} from '../constants';

export const setupUser = async () => {
  await exec('git', ['config', '--global', 'user.name', `"github-actions[bot]"`]);
  await exec('git', [
    'config',
    '--global',
    'user.email',
    `"github-actions[bot]@users.noreply.github.com"`,
  ]);
};

export const setupRemote = async (token: string, repoPath: string) => {
  await exec('git', [
    'remote',
    'set-url',
    'origin',
    `https://x-access-token:${token}@github.com/${repoPath}`,
  ]);
};

export const fetchTags = async () => {
  await exec(`git fetch --tags`);
};

export const getChangePackages = async (): Promise<Package[]> => {
  const lastTag = await exec(`git describe --tags --abbrev=0`);
  const changedFiles = (await exec(`git diff ${lastTag.trim()} HEAD --name-only`)).split('\n');
  const changedPackages = dedup(
    changedFiles
      .filter((path) => path.indexOf('packages/') === 0)
      .map((path) => {
        const matches = path.match(/^packages\/([^\/]+)\//);
        return matches?.[1] || '';
      })
      .filter((packageName) => packageName),
  );

  const existingChangedPackages = await filterExistingPackages(changedPackages);

  return existingChangedPackages;
};

export const getSortedGitTags = async (): Promise<GitTag[]> => {
  return (await exec(`git tag --list`)).split('\n').sort((a, b) => {
    const nameA = a.toUpperCase();
    const nameB = b.toUpperCase();

    if (nameA > nameB) {
      return -1;
    }
    if (nameA < nameB) {
      return 1;
    }

    return 0;
  });
};

export const commitVersion = async (packageName: string, version: string) => {
  await exec(`git add packages/*/package.json`);
  await exec(`git commit -m "${packageName}-${version}"`);
};

export const tagVersion = async (packageName: string, version: string) => {
  await exec(`git tag "${packageName}-${version}"`);
};

export const pushCommitWithTags = async () => {
  await exec(`git push --follow-tags`);
};

export const getMergeCommitInfo = (commitMessage: string): MergeCommitInfo | null => {
  const match = commitMessage.match(MERGE_PULL_COMMIT_REGEX);

  if (!match) {
    return null;
  }

  const pullNumber = match[1];

  if (!pullNumber) {
    return null;
  }

  return {
    commitMessage,
    pullNumber: Number(pullNumber),
  };
};
