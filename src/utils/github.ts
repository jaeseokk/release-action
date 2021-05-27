import * as github from '@actions/github';
import {GitTag} from '../types';

export const createRelease = async (
  octokit: ReturnType<typeof github.getOctokit>,
  {tagName}: {tagName: GitTag},
) => {
  await octokit.repos.createRelease({
    name: tagName,
    tag_name: tagName,
    body: '',
    ...github.context.repo,
  });
};
