import axios from 'axios';
import {RELEASE_URLS} from '../constants';
import {BumpedPackageInfo} from '../types';

export const getNotifyReleaseMessageBlock = (
  channelName: string,
  packageInfoList: BumpedPackageInfo[],
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
          type: 'plain_text',
          text: packageInfo.tag,
        },
        ...(RELEASE_URLS[packageInfo.packageName]
          ? {
              accessory: {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Link',
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
          text: `*Release Note*\n\n${releaseNote}`,
        },
      },
    ],
  };
};

export const notifyRelease = async (
  slackToken: string,
  channelName: string,
  changedPackages: BumpedPackageInfo[],
  releaseNote: string,
) => {
  const messageBlock = getNotifyReleaseMessageBlock(channelName, changedPackages, releaseNote);

  await axios.post('https://slack.com/api/chat.postMessage', messageBlock, {
    headers: {
      Authorization: `Bearer ${slackToken}`,
    },
  });
};
