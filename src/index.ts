import * as core from '@actions/core';
import * as github from '@actions/github';
import {bumpPackages, getMinorPartOfVersion} from './utils';
import {
  fetchTags,
  getChangePackages,
  getSortedGitTags,
  pushCommitWithTags,
  setupRemote,
  setupUser,
} from './utils/git';
import {createRelease} from './utils/github';

const run = async () => {
  const githubToken = core.getInput('token', {required: true});
  const githubRepositoryPath = process.env.GITHUB_REPOSITORY;
  const triggerCommitSha = process.env.GITHUB_SHA;

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

  const octokit = github.getOctokit(githubToken);

  await setupUser();
  await setupRemote(githubToken, githubRepositoryPath);
  await fetchTags();

  const changedPackages = await getChangePackages();

  console.log(`Changed pacakges: ${changedPackages}`);

  const gitTags = await getSortedGitTags();
  const minor = getMinorPartOfVersion();
  const tags = await bumpPackages(changedPackages, gitTags, minor);

  console.log(`New tags: ${tags}`);

  if (tags.length === 0) {
    return;
  }

  await pushCommitWithTags();

  tags.forEach((tag) => {
    createRelease(octokit, {tagName: tag});
  });

  core.setOutput('released', 'true');
  core.setOutput('releasedTags', JSON.stringify(tags));
};

try {
  run();
} catch (e: any) {
  console.error(e);
  core.setFailed(e.message);
}
