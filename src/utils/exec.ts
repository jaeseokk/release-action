import {exec as _exec} from '@actions/exec';

export const exec = async (commandLine: string, args?: string[]): Promise<string> => {
  let buffer = '';

  await _exec(commandLine, args, {
    listeners: {
      stdout: (data) => {
        buffer += data.toString();
      },
      stderr: (data) => {
        buffer += data.toString();
      },
    },
  });

  return buffer;
};
