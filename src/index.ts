import * as core from '@actions/core';
import {context} from './context';
import {bumpPackages, getMinorPartOfVersion, getReleaseNoteInfo} from './utils';
import {
  fetchTags,
  getChangedPackageInfos,
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

  const changedPackageInfos = await getChangedPackageInfos();

  console.log(`Changed pacakges: ${JSON.stringify(changedPackageInfos)}`);

  const gitTags = await getSortedGitTags();
  const minor = getMinorPartOfVersion();
  const bumpedPackageInfoList = await bumpPackages(changedPackageInfos, gitTags, minor);

  console.log(`New tags: ${bumpedPackageInfoList.map((packageInfo) => packageInfo.tag)}`);

  if (bumpedPackageInfoList.length === 0) {
    return;
  }

  await pushCommitWithTags();

  const {releaseNote, authors = []} = (await getReleaseNoteInfo(lastCommitMessage)) || {};

  console.log(`Release Note: ${releaseNote}`);

  const bumpedPackageInfoWithReleaseUrlList = await Promise.all(
    bumpedPackageInfoList.map(async (packageInfo) => {
      const release = await createRelease({tagName: packageInfo.tag, releaseNote});

      return {
        ...packageInfo,
        releaseUrl: release.data.html_url,
      };
    }),
  );

  if (slackToken && slackChannel) {
    await notifyRelease(
      slackToken,
      slackChannel,
      bumpedPackageInfoWithReleaseUrlList,
      authors,
      releaseNote || '',
    );
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
