import { createHash } from 'node:crypto';

export const hashRefreshToken = token => {
  return createHash('sha256').update(token).digest('hex');
};

