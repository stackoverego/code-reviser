const assert = require('node:assert/strict');
const { test } = require('node:test');
const { generatePracticeSuggestion } = require('../services/practiceSuggestionService');

const originalFetch = global.fetch;
const originalApiKey = process.env.GEMINI_API_KEY;

test.after(() => {
  global.fetch = originalFetch;
  if (originalApiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalApiKey;
  }
});

const reminder = {
  questionTitle: 'Two Sum',
  leetcodeUrl: 'https://leetcode.com/problems/two-sum/',
  difficulty: 'Easy',
  notes: 'Practice hash maps',
};

test('generates and validates a related LeetCode practice question', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                title: 'Contains Duplicate',
                url: 'https://leetcode.com/problems/contains-duplicate/description/',
                difficulty: 'Easy',
                whyRelated: 'Both problems use a hash set or map to detect values efficiently.',
              }),
            }],
          },
        }],
      }),
    };
  };

  const suggestion = await generatePracticeSuggestion(reminder);

  assert.equal(request.options.headers['x-goog-api-key'], 'test-key');
  assert.match(request.url, /gemini-2\.5-flash:generateContent$/);
  assert.equal(suggestion.title, 'Contains Duplicate');
  assert.equal(suggestion.leetcodeUrl, 'https://leetcode.com/problems/contains-duplicate/');
  assert.equal(suggestion.difficulty, 'Easy');
  assert.ok(suggestion.generatedAt instanceof Date);
});

test('rejects suggestions that link outside LeetCode', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              title: 'Unsafe link',
              url: 'https://example.com/problems/unsafe/',
              difficulty: 'Easy',
              whyRelated: 'Related pattern.',
            }),
          }],
        },
      }],
    }),
  });

  await assert.rejects(
    generatePracticeSuggestion(reminder),
    (error) => error.statusCode === 502 && /not a LeetCode problem/.test(error.message)
  );
});

test('rejects a suggestion that repeats the original question', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              title: 'Two Sum',
              url: 'https://leetcode.com/problems/two-sum/',
              difficulty: 'Easy',
              whyRelated: 'It is the original problem.',
            }),
          }],
        },
      }],
    }),
  });

  await assert.rejects(
    generatePracticeSuggestion(reminder),
    (error) => error.statusCode === 502 && /original question/.test(error.message)
  );
});

test('reports a missing Gemini API key as a configuration error', async () => {
  delete process.env.GEMINI_API_KEY;
  global.fetch = async () => {
    throw new Error('fetch should not be called without an API key');
  };

  await assert.rejects(
    generatePracticeSuggestion(reminder),
    (error) => error.statusCode === 503 && /GEMINI_API_KEY/.test(error.message)
  );
});

test('surfaces AI provider HTTP errors', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  global.fetch = async () => ({ ok: false, status: 429 });

  await assert.rejects(
    generatePracticeSuggestion(reminder),
    (error) => error.statusCode === 503 && /429/.test(error.message)
  );
});

test('retries a transient Gemini 503 and succeeds when the service recovers', async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  let requestCount = 0;
  global.fetch = async () => {
    requestCount += 1;
    if (requestCount === 1) return { ok: false, status: 503 };
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                title: 'Contains Duplicate',
                url: 'https://leetcode.com/problems/contains-duplicate/',
                difficulty: 'Easy',
                whyRelated: 'Both problems practice hash-based lookups.',
              }),
            }],
          },
        }],
      }),
    };
  };

  const suggestion = await generatePracticeSuggestion(reminder);

  assert.equal(requestCount, 2);
  assert.equal(suggestion.title, 'Contains Duplicate');
});
