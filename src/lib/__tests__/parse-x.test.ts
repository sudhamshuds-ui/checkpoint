import { describe, expect, it } from 'vitest';
import { bookmarkedTweetId, collectTweets, graphqlOperation, parseBookmarkTimeline, parseTweet } from '../parse-x';

const user = (handle: string) => ({
  result: {
    __typename: 'User',
    core: { name: `${handle} name`, screen_name: handle },
    avatar: { image_url: `https://pbs.twimg.com/profile_images/${handle}_normal.jpg` },
  },
});

const photoTweet = {
  __typename: 'Tweet',
  rest_id: '100',
  core: { user_results: user('designer') },
  legacy: {
    created_at: 'Wed Oct 01 12:00:00 +0000 2025',
    full_text: '@friend Look at this motion &amp; type https://t.co/link https://t.co/media',
    display_text_range: [8, 56],
    entities: { urls: [{ url: 'https://t.co/link', expanded_url: 'https://example.com/case' }] },
    extended_entities: {
      media: [
        {
          type: 'photo',
          url: 'https://t.co/media',
          media_url_https: 'https://pbs.twimg.com/media/abc.jpg',
          original_info: { width: 1200, height: 800 },
          ext_alt_text: 'A poster',
        },
      ],
    },
  },
};

const videoTweet = {
  __typename: 'TweetWithVisibilityResults',
  tweet: {
    rest_id: '200',
    core: { user_results: { result: { legacy: { name: 'Old Shape', screen_name: 'old', profile_image_url_https: 'a.jpg' } } } },
    legacy: {
      created_at: 'Thu Oct 02 12:00:00 +0000 2025',
      full_text: 'Clip',
      extended_entities: {
        media: [
          {
            type: 'video',
            media_url_https: 'https://pbs.twimg.com/ext_tw_video_thumb/x.jpg',
            original_info: { width: 1920, height: 1080 },
            video_info: {
              duration_millis: 12000,
              variants: [
                { content_type: 'application/x-mpegURL', url: 'https://video.twimg.com/a.m3u8' },
                { content_type: 'video/mp4', bitrate: 832000, url: 'https://video.twimg.com/low.mp4' },
                { content_type: 'video/mp4', bitrate: 2176000, url: 'https://video.twimg.com/high.mp4' },
              ],
            },
          },
        ],
      },
    },
    quoted_status_result: { result: { ...photoTweet, rest_id: '300' } },
  },
};

const timeline = {
  data: {
    bookmark_timeline_v2: {
      timeline: {
        instructions: [
          {
            type: 'TimelineAddEntries',
            entries: [
              { entryId: 'tweet-100', sortIndex: '1900000000000000001', content: { itemContent: { tweet_results: { result: photoTweet } } } },
              { entryId: 'tweet-200', sortIndex: '1900000000000000000', content: { itemContent: { tweet_results: { result: videoTweet } } } },
              { entryId: 'tweet-dead', sortIndex: '1', content: { itemContent: { tweet_results: { result: { __typename: 'TweetTombstone' } } } } },
              { entryId: 'cursor-bottom-1', content: { cursorType: 'Bottom', value: 'CURSOR' } },
            ],
          },
        ],
      },
    },
  },
};

describe('parseTweet', () => {
  it('reads a photo post and cleans its text', () => {
    const post = parseTweet(photoTweet)!;
    expect(post.id).toBe('100');
    expect(post.url).toBe('https://x.com/designer/status/100');
    expect(post.author).toEqual({ name: 'designer name', handle: 'designer', avatar: 'https://pbs.twimg.com/profile_images/designer_normal.jpg' });
    expect(post.text).toBe('Look at this motion & type https://example.com/case');
    expect(post.media).toEqual([{ type: 'photo', url: 'https://pbs.twimg.com/media/abc.jpg', width: 1200, height: 800, alt: 'A poster' }]);
  });

  it('unwraps visibility results, picks the best mp4 and reads the quoted post', () => {
    const post = parseTweet(videoTweet)!;
    expect(post.author.handle).toBe('old');
    expect(post.media[0]).toMatchObject({ type: 'video', videoUrl: 'https://video.twimg.com/high.mp4', durationMs: 12000 });
    expect(post.quote?.id).toBe('300');
    expect(post.quote).not.toHaveProperty('quote');
  });

  it('returns null for unavailable posts', () => {
    expect(parseTweet({ __typename: 'TweetTombstone' })).toBeNull();
    expect(parseTweet(undefined)).toBeNull();
  });
});

describe('parseBookmarkTimeline', () => {
  it('returns bookmarks in order with sort indexes and the cursor', () => {
    const { items, bottomCursor } = parseBookmarkTimeline(timeline);
    expect(items.map((i) => [i.post.id, i.sortIndex])).toEqual([
      ['100', '1900000000000000001'],
      ['200', '1900000000000000000'],
    ]);
    expect(bottomCursor).toBe('CURSOR');
  });
});

describe('helpers', () => {
  it('collects every tweet in a response once', () => {
    expect(collectTweets(timeline).map((p) => p.id)).toEqual(['100', '200']);
  });
  it('reads the operation name from a GraphQL URL', () => {
    expect(graphqlOperation('https://x.com/i/api/graphql/abc123/Bookmarks?variables=%7B%7D')).toBe('Bookmarks');
    expect(graphqlOperation('https://x.com/home')).toBeNull();
  });
  it('reads the tweet id from a bookmark mutation body', () => {
    expect(bookmarkedTweetId('{"variables":{"tweet_id":"42"},"queryId":"q"}')).toBe('42');
    expect(bookmarkedTweetId('not json')).toBeNull();
  });
});
