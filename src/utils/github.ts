import * as github from '@actions/github';
import {context} from '../context';
import {GitTag} from '../types';

export const createRelease = async ({
  tagName,
  releaseNote,
}: {
  tagName: GitTag;
  releaseNote?: string;
}) => {
  if (!context.octokit) {
    throw 'context error';
  }

  const releaseResult = await context.octokit.repos.createRelease({
    name: tagName,
    tag_name: tagName,
    body: releaseNote || '',
    ...github.context.repo,
  });

  return releaseResult;
};

export const getPullRequest = async ({pullNumber}: {pullNumber: number}) => {
  if (!context.octokit) {
    throw 'context error';
  }

  return await context.octokit.pulls.get({
    pull_number: pullNumber,
    ...github.context.repo,
  });
};

export const getPullRequestCommits = async ({pullNumber}: {pullNumber: number}) => {
  if (!context.octokit) {
    throw 'context error';
  }

  return await context.octokit.pulls.listCommits({
    pull_number: pullNumber,
    ...github.context.repo,
  });
};
