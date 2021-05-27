import {exec} from './exec';
import {GitTag, Package} from '../types';

export const getMinorPartOfVersion = (): string => {
  const nowLocaleString = new Date().toLocaleString('en-US', {timeZone: 'Asia/Seoul'});
  const now = new Date(nowLocaleString);
  let year = `${now.getFullYear()}`.slice(-2);
  let month = `0${now.getMonth() + 1}`.slice(-2);
  let date = `0${now.getDate()}`.slice(-2);

  return `${year}${month}${date}`;
};

export const bumpPackages = async (
  changedPackages: Package[],
  gitTags: GitTag[],
  minor: string,
  {packageNamespace = ''}: {packageNamespace?: string} = {},
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
    const tag = `${prefix}${version}`;
    const packageNamespaceWithSlash = packageNamespace ? `${packageNamespace}/` : '';

    await exec(
      `yarn workspace ${packageNamespaceWithSlash}${packageName} config set version-tag-prefix "${packageName}-"`,
    );
    await exec(
      `yarn workspace ${packageNamespaceWithSlash}${packageName} config set version-git-message "${packageName}-%s"`,
    );
    await exec(
      `yarn workspace ${packageNamespaceWithSlash}${packageName} version --new-version 1.${minor}.${nextPatch}`,
    );

    tags.push(tag);
  }

  return tags;
};
