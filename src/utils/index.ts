import path from 'path';
import fs from 'fs';
import {GitTag, Package} from '../types';
import {commitVersion, tagVersion} from './git';
import {exec} from '@actions/exec';

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
) => {
  const tags = [];

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

    tags.push(versionWithPackage);
  }

  return tags;
};
