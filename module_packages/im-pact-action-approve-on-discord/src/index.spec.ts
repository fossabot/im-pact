import { ActionTestHelper, ExtractedTweet } from '@arisucool/im-pact-core';
import ActionShareOnDiscord from './index';

describe('Initializations', () => {
  test('Basic', () => {
    ActionTestHelper.initModule('ActionShareOnDiscord', {}, ActionShareOnDiscord);
  });
});
