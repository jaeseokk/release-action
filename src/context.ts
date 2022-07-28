import * as github from '@actions/github';

export interface Context {
  create: ({githubToken}: {githubToken: string}) => void;
  octokit?: ReturnType<typeof github.getOctokit>;
}

let isCreated = false;

export const context: Context = {
  create: ({githubToken}) => {
    if (isCreated) {
      throw 'context aleady created';
    }

    context.octokit = github.getOctokit(githubToken);
  },
};
