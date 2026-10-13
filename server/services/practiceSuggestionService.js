const validDifficulties = ['Easy', 'Medium', 'Hard'];

const createServiceError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeSuggestionUrl = (value) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw createServiceError('AI returned an invalid LeetCode URL', 502);
  }

  if (
    url.protocol !== 'https:' ||
    !['leetcode.com', 'www.leetcode.com'].includes(url.hostname) ||
    !url.pathname.startsWith('/problems/')
  ) {
    throw createServiceError('AI returned a link that is not a LeetCode problem', 502);
  }

  const slug = url.pathname.split('/')[2];
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    throw createServiceError('AI returned an invalid LeetCode problem link', 502);
  }

  return `https://leetcode.com/problems/${slug}/`;
};

const generatePracticeSuggestion = async (reminder) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw createServiceError('Practice suggestions are not configured. Add GEMINI_API_KEY to the server .env file.', 503);
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const prompt = [
    'Recommend exactly one real LeetCode problem for extra practice.',
    'It must practice an algorithm or problem-solving pattern closely related to the original question.',
    'Do not recommend the original question itself. Prefer the same difficulty; one step harder is acceptable.',
    'Return only JSON with the keys title, url, difficulty, and whyRelated.',
    'difficulty must be exactly Easy, Medium, or Hard. url must be the canonical HTTPS problem URL on leetcode.com.',
    `Original title: ${reminder.questionTitle}`,
    `Original URL: ${reminder.leetcodeUrl}`,
    `Original difficulty: ${reminder.difficulty}`,
    `User notes: ${reminder.notes || 'None'}`,
  ].join('\n');

  let response;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  title: { type: 'STRING' },
                  url: { type: 'STRING' },
                  difficulty: { type: 'STRING', enum: validDifficulties },
                  whyRelated: { type: 'STRING' },
                },
                required: ['title', 'url', 'difficulty', 'whyRelated'],
              },
            },
          }),
        }
      );
    } catch {
      throw createServiceError('Could not connect to the AI suggestion service. Please try again.', 502);
    }

    const isRetryable = [429, 500, 502, 503, 504].includes(response.status);
    if (response.ok || !isRetryable || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
  }

  if (!response.ok) {
    const statusCode = response.status === 429 || response.status === 503 ? 503 : 502;
    const message = response.status === 429 || response.status === 503
      ? `Gemini is temporarily unavailable (HTTP ${response.status}). Please try again in a moment.`
      : `AI suggestion service returned an error (${response.status}).`;
    throw createServiceError(message, statusCode);
  }

  let result;
  try {
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();
    result = JSON.parse(text);
  } catch {
    throw createServiceError('AI suggestion service returned an invalid response. Please try again.', 502);
  }

  if (
    typeof result.title !== 'string' ||
    !result.title.trim() ||
    !validDifficulties.includes(result.difficulty) ||
    typeof result.whyRelated !== 'string' ||
    !result.whyRelated.trim()
  ) {
    throw createServiceError('AI suggestion service returned an incomplete practice question. Please try again.', 502);
  }

  const leetcodeUrl = normalizeSuggestionUrl(result.url);
  const suggestedSlug = new URL(leetcodeUrl).pathname.split('/')[2];
  const originalSlug = reminder.leetcodeUrl.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i)?.[1];
  if (
    result.title.trim().toLowerCase() === reminder.questionTitle.trim().toLowerCase() ||
    (originalSlug && suggestedSlug.toLowerCase() === originalSlug.toLowerCase())
  ) {
    throw createServiceError('AI suggested the original question instead of a new practice problem. Please try again.', 502);
  }

  return {
    title: result.title.trim(),
    leetcodeUrl,
    difficulty: result.difficulty,
    whyRelated: result.whyRelated.trim(),
    generatedAt: new Date(),
  };
};

module.exports = { generatePracticeSuggestion };
