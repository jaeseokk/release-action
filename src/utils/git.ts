import {exec} from '../utils/exec';
import {GitTag, Package} from '../types';

export const setupUser = async () => {
  await exec('git', ['config', '--global', 'user.name', `"hb-release[bot]"`]);
  await exec('git', [
    'config',
    '--global',
    'user.email',
    `"hb-release[bot]@users.noreply.github.com"`,
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

  return [
    ...new Set(
      changedFiles
        .filter((path) => path.indexOf('packages/') === 0)
        .map((path) => {
          const matches = path.match(/^packages\/([^\/]+)\//);
          return matches?.[1] || '';
        }),
    ),
  ];
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

export const pushCommitWithTags = async () => {
  await exec(`git push --follow-tags`);
};
