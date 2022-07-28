import * as core from '@actions/core';
import {context} from './context';
import {bumpPackages, getMinorPartOfVersion, getReleaseNote} from './utils';
import {
  fetchTags,
  getChangePackages,
  getSortedGitTags,
  pushCommitWithTags,
  setupRemote,
  setupUser,
} from './utils/git';
import {createRelease} from './utils/github';
import {notifyRelease} from './utils/slack';

const run = async () => {
  const githubToken = core.getInput('token', {required: true});
  const githubRepositoryPath = process.env.GITHUB_REPOSITORY;
  const triggerCommitSha = process.env.GITHUB_SHA;
  const slackToken = core.getInput('slackToken');
  const lastCommitMessage = core.getInput('lastCommitMessage', {required: true});
  const slackChannel = core.getInput('slackChannel');

  if (!githubRepositoryPath) {
    core.setFailed('Unavailable github repo path.');
    return;
  }

  if (!triggerCommitSha) {
    core.setFailed('Unavailable commit sha');
    return;
  }

  core.setOutput('released', 'false');
  core.setOutput('releasedTags', '[]');

  context.create({
    githubToken,
  });

  await setupUser();
  await setupRemote(githubToken, githubRepositoryPath);
  await fetchTags();

  const changedPackages = await getChangePackages();

  console.log(`Changed pacakges: ${changedPackages}`);

  const gitTags = await getSortedGitTags();
  const minor = getMinorPartOfVersion();
  const bumpedPackageInfoList = await bumpPackages(changedPackages, gitTags, minor);

  console.log(`New tags: ${bumpedPackageInfoList.map((packageInfo) => packageInfo.tag)}`);

  if (bumpedPackageInfoList.length === 0) {
    return;
  }

  await pushCommitWithTags();

  const releaseNote = await getReleaseNote(lastCommitMessage);

  console.log(`Release Note: ${releaseNote}`);

  bumpedPackageInfoList.forEach((packageInfo) => {
    createRelease({tagName: packageInfo.tag, releaseNote});
  });

  if (slackToken && slackChannel) {
    await notifyRelease(slackToken, slackChannel, bumpedPackageInfoList, releaseNote || '');
  }

  core.setOutput('released', 'true');
  core.setOutput('releasedTags', JSON.stringify(bumpedPackageInfoList));
};

try {
  run();
} catch (e: any) {
  console.error(e);
  core.setFailed(e.message);
}
