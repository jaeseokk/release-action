export const MERGE_PULL_COMMIT_REGEX = /^Merge pull request #(\d+) from (.+)\/(.+)(\n+)?(.+)?$/im;

export const MD_RELEASE_NOTE_SECTION_REGEX = /#+ release note(\s+)?((.|\s)*)$/im;

export const MD_COMMENT_REGEX = /<!--(.|\s)+-->/im;

export const RELEASE_URLS: Record<string, string> = {
  auth: 'https://auth.howbuild.com',
  www: 'https://www.howbuild.com',
  partners: 'https://partners.howbuild.com',
  message: 'https://message.howbuild.com',
  sketch: 'https://sketch.howbuild.com',
  management: 'https://management.howbuild.com',
  blog: 'https://blog.howbuild.com',
  architect: 'https://architect.howbuild.com',
  marketplace: 'https://marketplace.howbuild.com',
  shared: 'https://ui.preview.howbuild.com',
};
