import axios from 'axios';

import { getApiErrorMessage } from '@/utils/errors';

const t = (key: string) => key;

describe('getApiErrorMessage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns generic for non-axios errors', () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);
    expect(getApiErrorMessage(new Error('x'), t)).toBe('errors.generic');
  });

  it('returns banned message for 403 banned detail', () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const error = {
      response: { status: 403, data: { detail: 'User is banned' } },
    };
    expect(getApiErrorMessage(error, t)).toBe('errors.userBanned');
  });
});
