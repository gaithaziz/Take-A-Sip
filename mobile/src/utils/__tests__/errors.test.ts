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

  it('translates backend target-not-found details instead of showing raw text', () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const error = {
      response: { status: 404, data: { detail: 'size target not found' } },
    };
    expect(getApiErrorMessage(error, t)).toBe('errors.menuTargetMissing');
  });

  it('maps validation arrays to a friendly validation message', () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const error = {
      response: { status: 422, data: { detail: [{ msg: 'Input should be a valid UUID', loc: ['body', 'entity_id'] }] } },
    };
    expect(getApiErrorMessage(error, t)).toBe('validation.requiredFields');
  });

  it('does not leak unknown backend details into the UI', () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const error = {
      response: { status: 400, data: { detail: 'raw_internal_backend_detail_abc123' } },
    };
    expect(getApiErrorMessage(error, t)).toBe('errors.generic');
  });
});
