import path from 'path';
import fs from 'fs';
import globby from 'globby';

import {exec} from '../utils/exec';
import {GitTag, MergeCommitInfo, Package, PackageInfo} from '../types';
import {dedup, destructureVersionTag, filterExistingPackages, getRootPackageJson} from '.';
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

export const getPackageInfos = async (): Promise<PackageInfo[]> => {
  const rootPackageJson = await getRootPackageJson();
  const packageGlobs = Array.isArray(rootPackageJson.workspaces)
    ? rootPackageJson.workspaces
    : !!rootPackageJson.workspaces.packages
    ? rootPackageJson.workspaces.packages
    : [];
  const directories = await globby(packageGlobs, {
    onlyDirectories: true,
    expandDirectories: false,
    ignore: ['**/node_modules'],
  });
  const result = directories
    .map((dir) => {
      try {
        const isPackage = fs.existsSync(path.join(dir, 'package.json'));
        const name = dir.match(/[^/]+$/)?.[0] || '';

        if (isPackage && name) {
          return {dir, name};
        } else {
          return null;
        }
      } catch (e) {
        return null;
      }
    })
    .filter((v) => v);

  return result as PackageInfo[];
};

export const getChangedPackageInfos = async (): Promise<PackageInfo[]> => {
  const packageInfos = await getPackageInfos();
  const lastTag = await exec(`git describe --tags --abbrev=0`);
  const changedFiles = (await exec(`git diff ${lastTag.trim()} HEAD --name-only`)).split('\n');

  const changedPackageInfos = packageInfos.filter((packageInfo) =>
    changedFiles.some((file) => file.indexOf(packageInfo.dir) === 0),
  );

  return changedPackageInfos;
};

export const getSortedGitTags = async (): Promise<GitTag[]> => {
  return (await exec(`git tag --list`)).split('\n').sort((a, b) => {
    const destructuredA = destructureVersionTag(a);
    const destructuredB = destructureVersionTag(b);

    if (!destructuredA && !destructuredB) {
      return 0;
    }

    if (!destructuredA) {
      return 1;
    }

    if (!destructuredB) {
      return -1;
    }

    const {packageName: packageName1, major: major1, minor: minor1, patch: patch1} = destructuredA;
    const {packageName: packageName2, major: major2, minor: minor2, patch: patch2} = destructuredB;

    if (packageName1 > packageName2) {
      return -1;
    }

    if (packageName1 < packageName2) {
      return 1;
    }

    if (major1 !== major2) {
      return +major1 < +major2 ? 1 : -1;
    }

    if (minor1 !== minor2) {
      return +minor1 < +minor2 ? 1 : -1;
    }

    if (patch1 !== patch2) {
      return +patch1 < +patch2 ? 1 : -1;
    }

    return 0;
  });
};

export const commitVersion = async (packageInfo: PackageInfo, version: string) => {
  await exec(`git add **/package.json`);
  await exec(`git commit -m "${packageInfo.name}-${version}"`);
};

export const tagVersion = async (packageInfo: PackageInfo, version: string) => {
  await exec(`git tag "${packageInfo.name}-${version}"`);
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
