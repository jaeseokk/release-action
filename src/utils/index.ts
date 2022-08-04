import path from 'path';
import fs from 'fs';
import {BumpedPackageInfo, GitTag, Package} from '../types';
import {commitVersion, getMergeCommitInfo, tagVersion} from './git';
import {exec} from '@actions/exec';
import {getPullRequest, getPullRequestCommits} from './github';
import {context} from '../context';
import {MD_COMMENT_REGEX, MD_RELEASE_NOTE_SECTION_REGEX} from '../constants';

export const destructureVersionTag = (tag: string) => {
  const match = tag.match(/^(.+)-(\d+)\.(\d+)\.(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    packageName: match[1],
    major: match[2],
    minor: match[3],
    patch: match[4],
  };
};

export const dedup = <T>(collection: T[]) => {
  return [...new Set(collection)];
};

export const filterExistingPackages = async (packages: Package[]) => {
  return packages.filter(
    (packageName) =>
      packageName && fs.existsSync(path.join(process.cwd(), 'packages', packageName)),
  );
};

export const getMinorPartOfVersion = (): string => {
  const nowLocaleString = new Date().toLocaleString('en-US', {timeZone: 'Asia/Seoul'});
  const now = new Date(nowLocaleString);
  let year = `${now.getFullYear()}`.slice(-2);
  let month = `0${now.getMonth() + 1}`.slice(-2);
  let date = `0${now.getDate()}`.slice(-2);

  return `${year}${month}${date}`;
};

export const findPackageJson = (packageName: Package) => {
  const packageJsonPath = path.join(process.cwd(), 'packages', packageName, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('Could not find package.json');
  }

  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
};

export const updateVersionOfPackageJson = async (packageName: string, version: string) => {
  const packageJsonPath = path.join(process.cwd(), 'packages', packageName, 'package.json');
  const packageJson = findPackageJson(packageName);

  const nextPakcageJson = {
    ...packageJson,
    version,
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(nextPakcageJson, null, 2) + '\n');

  await exec(`cat ${packageJsonPath}`);
};

export const bumpPackages = async (
  changedPackages: Package[],
  gitTags: GitTag[],
  minor: string,
): Promise<BumpedPackageInfo[]> => {
  const bumpedPackageInfoList = [];

  for (const packageName of changedPackages) {
    const prevVersion = gitTags.find((tag) => tag.indexOf(`${packageName}-1.${minor}`) === 0);
    const patchPartOfPrevVersion = prevVersion ? prevVersion.split('.')[2] : null;
    const nextPatch =
      patchPartOfPrevVersion && !isNaN(parseInt(patchPartOfPrevVersion))
        ? parseInt(patchPartOfPrevVersion) + 1
        : 0;
    const prefix = `${packageName}-`;
    const version = `1.${minor}.${nextPatch}`;
    const versionWithPackage = `${prefix}${version}`;

    await updateVersionOfPackageJson(packageName, version);
    await commitVersion(packageName, version);
    await tagVersion(packageName, version);

    bumpedPackageInfoList.push({
      packageName,
      version,
      tag: versionWithPackage,
    });
  }

  return bumpedPackageInfoList;
};

export const extractReleaseNoteFromPullRequestBody = (pullRequestBody: string) => {
  console.log(pullRequestBody);

  const match = pullRequestBody.match(MD_RELEASE_NOTE_SECTION_REGEX);

  console.log('match', match);

  if (!match) {
    return '';
  }

  const releaseNote = (match[2] || '').replace(MD_COMMENT_REGEX, '').trim();

  return releaseNote;
};

export const getReleaseNoteInfo = async (lastCommitMessage: string) => {
  /**
   * 1. check merge commit
   * 2.1 if no, return null
   * 2.2 if yes, get pull numbmer
   * 3. get pull request body
   * 4. get release note section and retrun it
   */

  if (!context.octokit) {
    throw 'context error';
  }

  const mergeCommitInfo = getMergeCommitInfo(lastCommitMessage);

  console.log('mergeCommitInfo', mergeCommitInfo);

  if (!mergeCommitInfo) {
    return undefined;
  }

  const pullNumber = mergeCommitInfo.pullNumber;
  const pullRequestInfo = await getPullRequest({pullNumber});
  const authors = (await getPullRequestCommits({pullNumber})).data
    .filter((commit) => !!commit.author?.login)
    .map((commit) => commit.author?.login || '');
  const releaseNote = extractReleaseNoteFromPullRequestBody(pullRequestInfo.data.body || '');

  return {
    pullNumber,
    authors,
    releaseNote: releaseNote || pullRequestInfo.data.title,
  };
};
