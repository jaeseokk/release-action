import axios from 'axios';
import {RELEASE_URLS} from '../constants';
import {BumpedPackageInfoWithReleaseUrl} from '../types';

export const slackifyMarkdown = (content: string) => {
  const slackifiedContent = content
    .split('\n')
    .map((line) => line.replace(/^( *)(\*)( )/, '$1•$2'))
    .join('\n')
    .replace(/\[([\w\s\d]+)\]\((https?:\/\/[\w\d./?=#]+)\)/g, '<$2|$1>');

  return slackifiedContent;
};

export const getNotifyReleaseMessageBlock = (
  channelName: string,
  packageInfoList: BumpedPackageInfoWithReleaseUrl[],
  authors: string[],
  releaseNote: string,
) => {
  return {
    channel: channelName,
    text: 'HOWBUILD FE Release 알림',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*HOWBUILD FE Release 알림* :rocket:',
        },
      },
      ...packageInfoList.map((packageInfo) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<${packageInfo.releaseUrl}|${packageInfo.tag}>`,
        },
        ...(RELEASE_URLS[packageInfo.packageName]
          ? {
              accessory: {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Visit',
                },
                value: packageInfo.tag,
                url: RELEASE_URLS[packageInfo.packageName],
                action_id: `${packageInfo.tag}-action`,
              },
            }
          : {}),
      })),
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Release Note*\n\n${slackifyMarkdown(releaseNote)}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `> 👍 thx ${authors.map((author) => `@${author}`).join(' ')}`,
        },
      },
    ],
  };
};

export const notifyRelease = async (
  slackToken: string,
  channelName: string,
  changedPackages: BumpedPackageInfoWithReleaseUrl[],
  authors: string[],
  releaseNote: string,
) => {
  const messageBlock = getNotifyReleaseMessageBlock(
    channelName,
    changedPackages,
    authors,
    releaseNote,
  );

  await axios.post('https://slack.com/api/chat.postMessage', messageBlock, {
    headers: {
      Authorization: `Bearer ${slackToken}`,
    },
  });
};
