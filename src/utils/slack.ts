import axios from 'axios';
import {BumpedPackageInfoWithReleaseUrl, ReleaseUrlMap} from '../types';

export const slackifyMarkdown = (content: string) => {
  const slackifiedContent = content
    .split('\n')
    .map((line) => line.replace(/^( *)(\*)( )/, '$1•$2'))
    .join('\n')
    .replace(/\[([\w\s\d(ㄱ-ㅎ|ㅏ-ㅣ|가-힣)]+)\]\((https?:\/\/[\w\d./?=#]+)\)/g, '<$2|$1>');

  return slackifiedContent;
};

export const getNotifyReleaseMessageBlock = ({
  channelName,
  packageInfoList,
  authors,
  title,
  releaseNote,
  releaseUrlMap,
}: {
  channelName: string;
  packageInfoList: BumpedPackageInfoWithReleaseUrl[];
  authors: string[];
  title: string;
  releaseNote: string;
  releaseUrlMap: ReleaseUrlMap;
}) => {
  return {
    channel: channelName,
    text: title,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${title}* :rocket:`,
        },
      },
      ...packageInfoList.map((packageInfo) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<${packageInfo.releaseUrl}|${packageInfo.tag}>`,
        },
        ...(releaseUrlMap[packageInfo.packageName]
          ? {
              accessory: {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Visit',
                },
                value: packageInfo.tag,
                url: releaseUrlMap[packageInfo.packageName],
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

export const notifyRelease = async ({
  slackToken,
  channelName,
  changedPackages,
  authors,
  title = 'Release 알림',
  releaseNote,
  releaseUrlMap,
}: {
  slackToken: string;
  channelName: string;
  changedPackages: BumpedPackageInfoWithReleaseUrl[];
  authors: string[];
  title?: string;
  releaseNote: string;
  releaseUrlMap: ReleaseUrlMap;
}) => {
  const messageBlock = getNotifyReleaseMessageBlock({
    channelName,
    packageInfoList: changedPackages,
    authors,
    title,
    releaseNote,
    releaseUrlMap,
  });

  await axios.post('https://slack.com/api/chat.postMessage', messageBlock, {
    headers: {
      Authorization: `Bearer ${slackToken}`,
    },
  });
};
