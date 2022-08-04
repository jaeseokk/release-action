export type GitTag = string;

export type Package = string;

export interface MergeCommitInfo {
  commitMessage: string;
  pullNumber: number;
}

export interface BumpedPackageInfo {
  packageName: string;
  version: string;
  tag: string;
}

export interface BumpedPackageInfoWithReleaseUrl extends BumpedPackageInfo {
  releaseUrl: string;
}
