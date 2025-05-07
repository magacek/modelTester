#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import CharacterTester from "./test-character.js";
import { AgentLogger } from "../agents/utils/logger.js";
import inquirer from "inquirer";
import dotenv from "dotenv";
import { CharacterCoordinator } from "../agents/character-coordinator.js";
import TwitterPipeline from "../twitter/TwitterPipeline.js";
import os from "os";
import Together from "together-ai";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = new AgentLogger("MultiModelTester");

const AVAILABLE_MODELS = [
  // {
  //   name: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  //   model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  //   provider: "together",
  // },
  // {
  //   name: "magacek/DeepSeek-R1-Distill-Qwen-1.5B-577a57b6-c9b1c7fa",
  //   model: "magacek/DeepSeek-R1-Distill-Qwen-1.5B-577a57b6-c9b1c7fa",
  //   provider: "together",
  // },

  // {
  //   name: "magacek/Llama-3.3-70B-Instruct-Reference-b3fc97d8-3541b9e4",
  //   model: "100k tweet trained model",
  //   provider: "together",
  // },
  // {
  //   name: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
  //   model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
  //   provider: "together",
  // },

  //second batch
  {
    name: "magacek/Llama-3.3-70B-Instruct-Reference-08f01c12",
    model: "magacek/Llama-3.3-70B-Instruct-Reference-08f01c12",
    provider: "together",
  },
  {
    name: "magacek/DeepSeek-R1-Distill-Llama-70B-eef110cbo",
    model: "magacek/DeepSeek-R1-Distill-Llama-70B-eef110cb",
    // This is the 3000 tweet trained model
    provider: "together",
  },

  {},

  // {
  //   name: "deepseek-ai/DeepSeek-R1", // Added for semantic similarity calculations
  //   model: "deepseek-ai/DeepSeek-R1",
  //   provider: "together",
  // },
];

// The model to use for semantic similarity calculations
const SEMANTIC_SIM_MODEL = "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8";

// Original test cases for replies
const DEFAULT_REPLY_TEST_CASES = [
  {
    text: "Hi there! I love your posts about technology. What do you think about the latest AI developments?",
    username: "[REDACTED]",
    type: "reply",
  },
  {
    text: "That's a stupid take. You clearly don't know what you're talking about.",
    username: "[REDACTED]",
    type: "reply",
  },
  {
    text: "Can you share your thoughts on your area of expertise?",
    username: "[REDACTED]",
    type: "reply",
  },
  {
    text: "I'm working on a project related to your field. Any advice you can share?",
    username: "[REDACTED]",
    type: "reply",
  },
  {
    text: "What's your favorite thing to talk about?",
    username: "[REDACTED]",
    type: "reply",
  },
];

const ADDITIONAL_TEST_CASES = [
  {
    text: "happiness has arrived",
    username: "[REDACTED]",
    type: "reply",
    hasImage: true,
  },
  {
    text: "Flew my parents to visit us in NYC last weekend. Their first time. My parents have never really been able to travel much. Couldn't afford it mostly. I can count on one hand how many times we left the Midwest growing up.",
    username: "[REDACTED]",
    type: "reply",
    hasImage: true,
  },
  {
    text: "big announcement coming tomorrow this is going to shock the world of planning and management to come",
    username: "[REDACTED]",
    type: "reply",
  },
  {
    text: "Try @Grok voice mode. It's awesome.",
    username: "[REDACTED]",
    type: "reply",
    hasLink: true,
  },
  {
    text: "🚨🇺🇸 all-in takes DC is back! @[REDACTED] is joined by secretary of agriculture @[REDACTED] -- reforming the usda -- massive impact of food stamps on the usda budget -- the trump admin's outsider advantage -- state of farming in 2025: labor, innovation, expanding markets",
    username: "[REDACTED]",
    type: "reply",
    hasVideo: true,
  },
  {
    text: "Who can give me the lowdown on Ray Peat",
    username: "[REDACTED]",
    type: "reply",
  },
  {
    text: "I've been reading about this before making a public take for about a year and I am thoroughly convinced that 'memetics' is not a fully fleshed, established field of inquiry.",
    username: "[REDACTED]",
    type: "reply",
  },
  {
    text: "YOU are invited. All the cool kids will be there...",
    username: "[REDACTED]",
    type: "reply",
    hasLink: true,
  },
  {
    text: "International Jazz Day🎶🎺🎷🎙😍 #GoodEveningWednesdayX😘🍷🥂",
    username: "[REDACTED]",
    type: "reply",
    hasImage: true,
  },
  {
    text: "Introducing Clova. Its cursor for video editing, generates full edits from a simple prompt & its live right now @ joinclova.com/edit",
    username: "[REDACTED]",
    type: "reply",
    hasVideo: true,
  },
  // More diverse reply scenarios
  {
    text: "Your thread on climate change was enlightening. Have you considered the economic impacts of rapid transitions?",
    username: "[REDACTED]",
    type: "reply",
  },
  {
    text: "I disagree with your take on NFTs. The technology has real potential beyond the current hype cycle.",
    username: "[REDACTED]",
    type: "reply",
  },
  {
    text: "Congrats on the funding round! 🎉 What's the first thing you're planning to tackle with the new resources?",
    username: "[REDACTED]",
    type: "reply",
  },
  {
    text: "Your podcast episode with @[REDACTED] was phenomenal. The discussion on quantum computing applications blew my mind.",
    username: "[REDACTED]",
    type: "reply",
  },
  {
    text: "I'm looking to transition into your industry. Any books or resources you'd recommend for someone starting from scratch?",
    username: "[REDACTED]",
    type: "reply",
  },
  {
    text: "Lol this take is wild. You really think web3 is going to revolutionize everything? It's just a rebrand of existing tech.",
    username: "[REDACTED]",
    type: "reply",
  },
  {
    text: "How do you balance family life with building a company? Struggling with this myself.",
    username: "[REDACTED]",
    type: "reply",
  },
  {
    text: "Your recent newsletter on AI safety raised important questions. Are you concerned about the pace of development?",
    username: "[REDACTED]",
    type: "reply",
  },
  {
    text: "I implemented the strategy you suggested last month and our conversion rate is up 32%! Thanks for sharing your knowledge.",
    username: "[REDACTED]",
    type: "reply",
  },
  {
    text: "What's your take on remote work becoming the norm? Is the office truly dead?",
    username: "[REDACTED]",
    type: "reply",
  },

  // Test cases for standalone posts (not replies)
  {
    type: "post",
    promptText: "Share an insight about your industry or area of expertise",
  },
  {
    type: "post",
    promptText: "Announce a new project or initiative you're excited about",
  },
  {
    type: "post",
    promptText: "Ask your followers a thought-provoking question",
  },
  {
    type: "post",
    promptText: "Share a quick productivity tip",
  },
  {
    type: "post",
    promptText: "Post a hot take on a current trend in your field",
  },
  {
    type: "post",
    promptText: "Share something you've learned recently",
  },
  {
    type: "post",
    promptText: "Make a prediction about your industry",
  },
  {
    type: "post",
    promptText: "Share a book recommendation relevant to your expertise",
  },
  {
    type: "post",
    promptText: "Reflect on a challenge you've overcome",
  },
  {
    type: "post",
    promptText: "Share a statistic or data point that surprised you",
  },
  {
    type: "post",
    promptText: "Highlight someone in your network who's doing great work",
  },
  {
    type: "post",
    promptText: "Share your thoughts on work-life balance",
  },
  {
    type: "post",
    promptText: "Talk about a tool or resource you find invaluable",
  },
  {
    type: "post",
    promptText: "Celebrate a personal or professional milestone",
  },
  {
    type: "post",
    promptText: "Share an unpopular opinion about something in your field",
  },
];

// Combine all test cases
const ALL_TEST_CASES = [...DEFAULT_REPLY_TEST_CASES, ...ADDITIONAL_TEST_CASES];

// Constants from interactions.ts (moved from test-character.js)
const TWITTER_MESSAGE_HANDLER_TEMPLATE = `
# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@[REDACTED]):
{{bio}}
{{lore}}
{{topics}}

{{characterPostExamples}}

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

{{recentPosts}}

# TASK: Generate a post/reply in the voice, style and perspective of {{agentName}} (@[REDACTED]) while using the thread of tweets as additional context:

Current Post:
{{currentPost}}
Here is the descriptions of images in the Current post.
{{imageDescriptions}}

Thread of Tweets You Are Replying To:
{{formattedConversation}}

# INSTRUCTIONS: Generate a post in the voice, style and perspective of {{agentName}} (@[REDACTED]).
- Keep your reply concise and aim for under 150 characters.
Remember to include an action if appropriate.

Here is the current post text again.
{{currentPost}}
Here is the descriptions of images in the Current post.
{{imageDescriptions}}

Your generated response:`;

// New template for standalone posts
const TWITTER_POST_TEMPLATE = `
# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@[REDACTED]):
{{bio}}
{{lore}}
{{topics}}

{{characterPostExamples}}

Recent posts by {{agentName}}:
{{recentPosts}}

# TASK: Generate a standalone tweet/post in the voice, style and perspective of {{agentName}} (@[REDACTED]).

Prompt: {{promptText}}

# INSTRUCTIONS: 
- Generate a post that feels authentic to {{agentName}}'s style and expertise
- Keep it under 200 characters, unless there's a good reason for a thread
- Include hashtags or mentions if that aligns with their style
- Make it engaging and true to their voice

Your generated post:`;

/**
 * Load a character file from disk
 */
async function loadCharacterFile(filePath) {
  try {
    const fileContents = await fs.readFile(filePath, "utf8");
    return JSON.parse(fileContents);
  } catch (error) {
    logger.error(`Error loading character file: ${error.message}`);
    throw error;
  }
}

/**
 * Find character files in the workspace
 */
async function findCharacterFiles() {
  try {
    // Look in multiple possible locations
    const currentDir = process.cwd();
    const outputDir = path.join(currentDir, "outputs", "characters");
    const charactersDir = path.join(currentDir, "characters");

    let files = [];

    // Check each directory in order
    for (const dir of [outputDir, charactersDir, currentDir]) {
      try {
        const dirStats = await fs.stat(dir);
        if (dirStats.isDirectory()) {
          const dirFiles = await fs.readdir(dir);
          const jsonFiles = dirFiles
            .filter((file) => file.endsWith(".json"))
            .map((file) => ({
              name: file,
              path: path.join(dir, file),
              directory: path.relative(currentDir, dir) || ".",
            }));

          files.push(...jsonFiles);
        }
      } catch (error) {
        // Directory doesn't exist, just continue
      }
    }

    return files;
  } catch (error) {
    logger.error(`Error finding character files: ${error.message}`);
    return [];
  }
}

/**
 * Generate a character using a specific model
 */
async function generateCharacter(
  username,
  profile,
  topTweets,
  recentTweets,
  model
) {
  logger.info(`Generating character with model: ${model.name}`);

  try {
    // Ensure topTweets and recentTweets are properly formatted
    // CharacterCoordinator expects strings or arrays of tweet objects
    const formattedTopTweets = ensureTweetFormat(topTweets);
    const formattedRecentTweets = ensureTweetFormat(recentTweets);

    // Use the CharacterCoordinator with the specific model
    const coordinator = new CharacterCoordinator(model.model);
    const characterData = await coordinator.generateCharacter(
      username,
      profile,
      formattedTopTweets,
      formattedRecentTweets
    );

    logger.success(`Character generated with ${model.name}`);
    return characterData;
  } catch (error) {
    logger.error(
      `Error generating character with ${model.name}: ${error.message}`
    );
    return null;
  }
}

/**
 * Helper function to ensure tweets are in the correct format
 */
function ensureTweetFormat(tweets) {
  if (typeof tweets === "string") {
    // If it's already a string, return it as is
    return tweets;
  } else if (Array.isArray(tweets)) {
    // If it's an array of tweet objects, return it as is
    return tweets;
  } else if (tweets && typeof tweets === "object") {
    // If it might be a JSON object or some other format, try to extract the text
    if (tweets.text || tweets.full_text) {
      // Single tweet object
      return [tweets];
    } else if (tweets.toString) {
      // Convert to string if possible
      return tweets.toString();
    }
  }

  // Fallback to empty string
  console.log(`[DEBUG] Unhandled tweet format: ${typeof tweets}`, tweets);
  return "";
}

/**
 * Run tests on a character using a specific model
 */
async function testCharacterWithModel(character, model) {
  logger.info(`Testing character with model: ${model.name}`);

  try {
    // Create tester with the specific model configuration
    const testConfig = {
      model: model.model,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.5,
      semanticSimModel: SEMANTIC_SIM_MODEL,
    };

    // Run the tests
    const results = await runTestsWithModel(
      character,
      ALL_TEST_CASES,
      testConfig
    );

    // Separate results by type
    const replyResults = results.filter((r) => r.testType === "reply");
    const postResults = results.filter((r) => r.testType === "post");

    // Calculate averages for each type
    const replyMetrics = calculateAverageMetrics(replyResults);
    const postMetrics = calculateAverageMetrics(postResults);
    const overallMetrics = calculateAverageMetrics(results);

    logger.success(`Testing completed with ${model.name}`);
    return {
      model: model.name,
      modelId: model.model,
      results: results,
      summary: {
        overall: overallMetrics,
        replies: replyMetrics,
        posts: postMetrics,
      },
    };
  } catch (error) {
    logger.error(`Error testing with ${model.name}: ${error.message}`);
    return {
      model: model.name,
      modelId: model.model,
      error: error.message,
      results: [],
    };
  }
}

/**
 * Calculate average metrics across all results
 */
function calculateAverageMetrics(results) {
  if (!results || results.length === 0) return null;

  // Filter for valid metrics
  const validResults = results.filter((r) => r.similarityMetrics);
  if (validResults.length === 0) return null;

  // Calculate cosine similarity average
  const cosineAvg =
    validResults
      .filter(
        (r) => r.similarityMetrics?.cosineSimilarity?.average !== undefined
      )
      .reduce(
        (sum, r) => sum + r.similarityMetrics.cosineSimilarity.average,
        0
      ) /
      validResults.filter(
        (r) => r.similarityMetrics?.cosineSimilarity?.average !== undefined
      ).length || 0;

  // Calculate semantic similarity average
  const semanticAvg =
    validResults
      .filter((r) => r.similarityMetrics?.semanticSimilarity !== undefined)
      .reduce((sum, r) => sum + r.similarityMetrics.semanticSimilarity, 0) /
      validResults.filter(
        (r) => r.similarityMetrics?.semanticSimilarity !== undefined
      ).length || 0;

  // Log the calculation details to help diagnose issues
  logger.info(`Average metrics calculation:
    Total results: ${results.length}
    Valid results: ${validResults.length}
    Cosine similarity scores: ${validResults.map((r) => r.similarityMetrics?.cosineSimilarity?.average).join(", ")}
    Semantic similarity scores: ${validResults.map((r) => r.similarityMetrics?.semanticSimilarity).join(", ")}
    Cosine average: ${cosineAvg}
    Semantic average: ${semanticAvg}
  `);

  return {
    count: results.length,
    validResults: validResults.length,
    cosineSimilarity: cosineAvg,
    semanticSimilarity: semanticAvg,
  };
}

/**
 * Run all tests with a specific model configuration
 */
async function runTestsWithModel(character, testCases, config) {
  const results = [];
  const casesToRun = testCases.slice(0, 10); // Take the first 20

  for (let i = 0; i < casesToRun.length; i++) {
    const testCase = casesToRun[i];
    logger.info(
      `Running test case ${i + 1}/${casesToRun.length} with model ${config.model}`
    );

    let response;
    let similarityMetrics;

    if (testCase.type === "post") {
      response = await generatePost(character, testCase, config);
      logger.info(
        `Generated post response for model ${config.model} (${response.length} chars)`
      );

      logger.info(
        `Calculating similarity metrics for post from ${config.model}`
      );
      similarityMetrics = await calculateSimilarityMetrics(
        response,
        character,
        config
      );

      logger.info(
        `Post metrics for ${config.model} - Cosine: ${similarityMetrics.cosineSimilarity?.average || "N/A"}, Semantic: ${similarityMetrics.semanticSimilarity || "N/A"}`
      );

      results.push({
        testType: "post",
        promptText: testCase.promptText,
        response: response,
        similarityMetrics: similarityMetrics,
      });
    } else {
      // Default to reply type
      response = await generateReply(character, testCase, config);
      logger.info(
        `Generated reply response for model ${config.model} (${response.length} chars)`
      );

      logger.info(
        `Calculating similarity metrics for reply from ${config.model}`
      );
      similarityMetrics = await calculateSimilarityMetrics(
        response,
        character,
        config
      );

      logger.info(
        `Reply metrics for ${config.model} - Cosine: ${similarityMetrics.cosineSimilarity?.average || "N/A"}, Semantic: ${similarityMetrics.semanticSimilarity || "N/A"}`
      );

      results.push({
        testType: "reply",
        testCase: testCase.text,
        username: testCase.username,
        response: response,
        similarityMetrics: similarityMetrics,
      });
    }
  }

  // Sort results to maintain original test case order, if necessary.
  // Since we are processing sequentially, they should largely be in order.
  return results;
}

/**
 * Generate a reply to a test message
 */
async function generateReply(character, testCase, config) {
  try {
    // Format character data
    const bioText = character.bio?.join("\n") || "";
    const knowledgeText = character.knowledge?.join("\n") || "";
    const topicsText = character.topics?.join("\n") || "";
    const loreText = character.lore?.join("\n") || "";

    // Get 15 random examples from post examples if available
    const postExamples = character.postExamples || [];
    const randomExamples = [];
    if (postExamples.length > 0) {
      const sampleSize = Math.min(15, postExamples.length);
      const randomIndices = new Set();
      while (randomIndices.size < sampleSize) {
        randomIndices.add(Math.floor(Math.random() * postExamples.length));
      }

      randomIndices.forEach((index) => {
        randomExamples.push(postExamples[index]);
      });
    }

    // Format examples
    const examplesText =
      character.messageExamples
        ?.map((msg) => `[REDACTED]: ${msg.content?.text || msg.content || ""}`)
        .join("\n") ||
      randomExamples.join("\n") ||
      "";

    // Format random posts for recentPosts
    const recentPostsText = randomExamples
      .slice(0, 5)
      .map((post) => `Post by [REDACTED]: ${post}`)
      .join("\n");

    // Handle image, link, or video descriptions
    const imageDesc = testCase.hasImage ? "[This post contains an image]" : "";
    const linkDesc = testCase.hasLink ? "[This post contains a link]" : "";
    const videoDesc = testCase.hasVideo ? "[This post contains a video]" : "";
    const mediaDesc = [imageDesc, linkDesc, videoDesc]
      .filter(Boolean)
      .join("\n");

    // Format the prompt
    const context = formatTemplate(TWITTER_MESSAGE_HANDLER_TEMPLATE, {
      agentName: character.name,
      twitterUserName: "[REDACTED]",
      bio: bioText,
      knowledge: knowledgeText,
      topics: topicsText,
      lore: loreText,
      characterPostExamples: examplesText,
      recentPostInteractions: "",
      recentPosts: recentPostsText,
      currentPost: `ID: 123456789\nFrom: [REDACTED] (@[REDACTED])\nText: ${testCase.text}`,
      formattedConversation: `@[REDACTED] (May 4, 12:30):\n        ${testCase.text}`,
      imageDescriptions: mediaDesc,
    });

    // Make API call to generate response
    const together = new Together({
      apiKey: process.env.TOGETHER_API_KEY,
    });

    const response = await together.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: "system",
          content: character.system,
        },
        {
          role: "user",
          content: context,
        },
      ],
      max_tokens: 1000, // Adjusted for replies (aiming for < 150 chars, aligning with prompt change)
      temperature: config.temperature,
      top_p: config.top_p,
      frequency_penalty: config.frequency_penalty,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    logger.error(`Error generating reply: ${error.message}`);
    return "Error generating response: " + error.message;
  }
}

/**
 * Generate a standalone post
 */
async function generatePost(character, testCase, config) {
  try {
    // Format character data
    const bioText = character.bio?.join("\n") || "";
    const knowledgeText = character.knowledge?.join("\n") || "";
    const topicsText = character.topics?.join("\n") || "";
    const loreText = character.lore?.join("\n") || "";

    // Get random examples from post examples
    const postExamples = character.postExamples || [];
    const randomExamples = [];
    if (postExamples.length > 0) {
      const sampleSize = Math.min(15, postExamples.length);
      const randomIndices = new Set();
      while (randomIndices.size < sampleSize) {
        randomIndices.add(Math.floor(Math.random() * postExamples.length));
      }

      randomIndices.forEach((index) => {
        randomExamples.push(postExamples[index]);
      });
    }

    // Format examples and recent posts
    const examplesText = randomExamples.join("\n") || "";
    const recentPostsText = randomExamples
      .slice(0, 5)
      .map((post) => `Post by [REDACTED]: ${post}`)
      .join("\n");

    // Format the prompt
    const context = formatTemplate(TWITTER_POST_TEMPLATE, {
      agentName: character.name,
      twitterUserName: "[REDACTED]",
      bio: bioText,
      knowledge: knowledgeText,
      topics: topicsText,
      lore: loreText,
      characterPostExamples: examplesText,
      recentPosts: recentPostsText,
      promptText: testCase.promptText,
    });

    // Make API call to generate post
    const together = new Together({
      apiKey: process.env.TOGETHER_API_KEY,
    });

    const response = await together.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: "system",
          content: character.system,
        },
        {
          role: "user",
          content: context,
        },
      ],
      max_tokens: 1000, // Adjusted for posts (aiming for < 200 chars)
      temperature: config.temperature,
      top_p: config.top_p,
      frequency_penalty: config.frequency_penalty,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    logger.error(`Error generating post: ${error.message}`);
    return "Error generating post: " + error.message;
  }
}

/**
 * Calculate similarity metrics between the response and the character's post examples
 */
async function calculateSimilarityMetrics(response, character, config) {
  logger.info(
    `Calculating semantic similarity using LLM: ${SEMANTIC_SIM_MODEL}`
  );
  logger.info(
    `Using embedding model: togethercomputer/m2-bert-80M-8k-retrieval for cosine similarity`
  );
  try {
    const postExamples = character.postExamples || [];
    const messageExamples =
      character.messageExamples?.map(
        (msg) => msg.content?.text || msg.content || ""
      ) || [];
    const allExamples = [...postExamples, ...messageExamples].filter(Boolean);

    if (allExamples.length === 0) {
      logger.warn("No examples found for comparison");
      return {
        cosineSimilarity: {
          average: 0,
          max: 0,
          scores: [],
        },
        semanticSimilarity: 0,
        note: "No examples available for comparison",
      };
    }

    // Use Together AI embedding model for cosine similarity
    const together = new Together({
      apiKey: process.env.TOGETHER_API_KEY,
    });

    const embeddingResponse = await together.embeddings.create({
      model: "togethercomputer/m2-bert-80M-8k-retrieval",
      input: [response, ...allExamples],
    });

    const responseEmbedding = embeddingResponse.data[0].embedding;
    const exampleEmbeddings = embeddingResponse.data
      .slice(1)
      .map((item) => item.embedding);

    // Calculate cosine similarity with each example
    const cosineScores = exampleEmbeddings.map((embedding) =>
      calculateCosineSimilarity(responseEmbedding, embedding)
    );

    // Calculate average and max cosine similarity
    const avgCosineSimilarity =
      cosineScores.reduce((sum, score) => sum + score, 0) / cosineScores.length;
    const maxCosineSimilarity = Math.max(...cosineScores);

    // For semantic similarity, use the specified semantic similarity model
    const semanticSimPrompt = `
    You are an expert evaluator of writing style, tone, and content.
    Compare the following texts for semantic and stylistic similarity on a scale from 0 to 100.
    0 means completely different. 100 means nearly identical in style, tone, and perspective.

    EXAMPLE TEXTS FROM THE CHARACTER (up to 3 samples):
    ${allExamples.slice(0, 3).join("\n\n")}

    GENERATED RESPONSE TO EVALUATE:
    ${response}

    Output ONLY the numerical similarity score (0-100). Do not include any other text, explanation, or formatting.
    Similarity Score:`;

    const semanticResponse = await together.chat.completions.create({
      model: SEMANTIC_SIM_MODEL,
      messages: [{ role: "user", content: semanticSimPrompt }],
      max_tokens: 10, // Reduced for a numerical score
      temperature: 0.1, // Lowered temperature for more deterministic score output
    });

    const semanticText = semanticResponse.choices[0].message.content.trim();
    let semanticScore = extractScore(semanticText);

    // If semantic score is 0, try a backup approach with a simpler prompt
    if (!semanticScore) {
      logger.info(
        "First semantic score extraction failed, trying backup approach"
      );
      logger.info(`Raw primary semantic response: ${semanticText}`);

      try {
        const backupPrompt = `
On a scale of 0-100, how similar is this generated text to these examples in terms of writing style, voice, and tone?
Examples: ${allExamples.slice(0, 2).join("\n\n")}
Generated: ${response}
Answer with just a number from 0-100.`;

        const backupResponse = await together.chat.completions.create({
          model: SEMANTIC_SIM_MODEL,
          messages: [{ role: "user", content: backupPrompt }],
          max_tokens: 10,
          temperature: 0.1,
        });

        const backupText = backupResponse.choices[0].message.content.trim();
        logger.info(`Raw backup semantic response: ${backupText}`);
        const backupScore = extractScore(backupText);

        if (backupScore) {
          semanticScore = backupScore;
          logger.info(
            `Successfully extracted backup semantic score: ${semanticScore}`
          );
        }
      } catch (error) {
        logger.warn(
          `Backup semantic score calculation failed: ${error.message}`
        );
      }
    }

    // Find most similar example by cosine similarity
    const maxIndex = cosineScores.indexOf(maxCosineSimilarity);
    const mostSimilarExample = allExamples[maxIndex];

    return {
      cosineSimilarity: {
        average: avgCosineSimilarity,
        max: maxCosineSimilarity,
        scores: cosineScores,
      },
      semanticSimilarity: semanticScore || 0,
      mostSimilarExample: {
        text: mostSimilarExample,
        similarity: maxCosineSimilarity,
      },
    };
  } catch (error) {
    logger.error(`Error calculating similarity metrics: ${error.message}`);
    return {
      cosineSimilarity: {
        average: 0,
        max: 0,
        scores: [],
      },
      semanticSimilarity: 0,
      error: error.message,
    };
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function calculateCosineSimilarity(vec1, vec2) {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (mag1 * mag2);
}

/**
 * Extract numerical score from text
 */
function extractScore(text) {
  // Look for specific patterns like "score: 85" or "similarity: 78.5" or just numbers
  const patterns = [
    /similarity(?:\s+score)?(?:\s*[:=]\s*)(\d+(?:\.\d+)?)/i,
    /score(?:\s*[:=]\s*)(\d+(?:\.\d+)?)/i,
    /rating(?:\s*[:=]\s*)(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(?:\/|out of)\s*100/i,
    /\b(\d+(?:\.\d+)?)\b/, // Fallback to any number
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const score = parseFloat(match[1]);
      // Normalize to 0-1 range if it's in 0-100 range
      return score > 1 ? score / 100 : score;
    }
  }

  // If no number found, search for textual ratings
  if (/high|strong|excellent|very similar/i.test(text)) return 0.85;
  if (/good|moderate|average|somewhat similar/i.test(text)) return 0.5;
  if (/low|poor|weak|not similar/i.test(text)) return 0.2;

  return 0.0; // Default fallback if nothing found
}

/**
 * Format template with values
 */
function formatTemplate(template, values) {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, "g"), value || "");
  }
  return result;
}

/**
 * Run tests on a character using multiple models in parallel
 */
async function testWithMultipleModels(character, selectedModels) {
  logger.start(`Testing character with ${selectedModels.length} models`);

  try {
    // Run all tests in parallel with Promise.all
    const testPromises = selectedModels.map((model) =>
      testCharacterWithModel(character, model)
    );

    // Wait for all tests to complete
    const testResults = await Promise.all(testPromises);

    logger.success(`All model tests completed`);
    return testResults;
  } catch (error) {
    logger.error(`Error in multi-model testing: ${error.message}`);
    throw error;
  }
}

/**
 * Generate character with multiple models and test them
 */
async function generateAndTestWithMultipleModels(username, selectedModels) {
  logger.start(
    `Generating and testing character for [REDACTED] with ${selectedModels.length} models`
  );

  try {
    // Initialize Twitter pipeline and scrape tweets
    logger.info(`Scraping tweets for [REDACTED]...`);
    const pipeline = new TwitterPipeline(username);
    const analytics = await pipeline.run();

    if (!analytics) {
      throw new Error(`Failed to collect tweets for [REDACTED]`);
    }

    // Get profile data
    const profile = await pipeline.scraper.getProfile(username);
    const baseDir = pipeline.dataOrganizer.baseDir;

    // Load tweet data
    const statsPath = path.join(baseDir, "analytics", "stats.json");
    const tweetsPath = path.join(baseDir, "raw", "tweets.json");

    let stats;
    let tweets;
    try {
      stats = JSON.parse(await fs.readFile(statsPath, "utf8"));
      tweets = JSON.parse(await fs.readFile(tweetsPath, "utf8"));
    } catch (err) {
      logger.error(`Error reading tweet data: ${err.message}`);
      stats = { engagement: { topTweets: [] } };
      tweets = [];
    }

    // Prepare tweets in both formats - array and string
    const recentTweetsArray = tweets.slice(0, 10);
    const recentTweetsText = recentTweetsArray
      .map((tweet) => tweet.text || tweet.full_text || "")
      .join("\n");

    const topTweetsArray = stats.engagement?.topTweets || [];
    const topTweetsText = topTweetsArray
      .map((tweet) => tweet.text || tweet.full_text || "")
      .join("\n");

    // Generate characters with each model
    logger.info(
      `Generating characters with ${selectedModels.length} models...`
    );
    const generationPromises = selectedModels.map(async (model) => {
      const character = await generateCharacter(
        username,
        profile,
        topTweetsText, // Use string format for better compatibility
        recentTweetsText, // Use string format for better compatibility
        model
      );

      if (character) {
        // Save the character to a model-specific file
        const timestamp = new Date().toISOString().replace(/:/g, "-");

        // Create a more organized directory structure
        const outputBaseDir = path.join(process.cwd(), "outputs", "characters");
        const characterDir = path.join(outputBaseDir, username);

        // Ensure all directories exist
        await fs.mkdir(outputBaseDir, { recursive: true });
        await fs.mkdir(characterDir, { recursive: true });

        // Clean model name for filename
        const safeModelName = model.name.replace(/[\/\\:*?"<>|]/g, "_");

        const outputFile = path.join(
          characterDir,
          `${safeModelName}_${timestamp}.json`
        );

        await fs.writeFile(outputFile, JSON.stringify(character, null, 2));
        logger.info(`Saved character for model ${model.name} to ${outputFile}`);

        return {
          model: model.name,
          modelId: model.model,
          character: character,
          path: outputFile,
        };
      }

      return {
        model: model.name,
        modelId: model.model,
        error: "Failed to generate character",
        character: null,
      };
    });

    const generatedCharacters = await Promise.all(generationPromises);

    // Test each generated character with all models
    logger.info(`Testing all generated characters with all models...`);
    const allTestResults = [];

    for (const genChar of generatedCharacters) {
      if (genChar.character) {
        logger.info(
          `Testing character generated by ${genChar.model} with all models...`
        );
        const testResults = await testWithMultipleModels(
          genChar.character,
          selectedModels
        );

        allTestResults.push({
          generatedBy: genChar.model,
          generatedById: genChar.modelId,
          characterPath: genChar.path,
          testResults: testResults,
        });
      }
    }

    // Save the comprehensive results
    const resultsDir = path.join(process.cwd(), "outputs", "test_results");
    await fs.mkdir(resultsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const resultsFile = path.join(
      resultsDir,
      `[REDACTED]_multi_model_tests_${timestamp}.json`
    );

    await fs.writeFile(
      resultsFile,
      JSON.stringify(
        {
          username: "[REDACTED]",
          models: selectedModels.map((m) => ({ name: m.name, id: m.model })),
          timestamp: new Date().toISOString(),
          results: allTestResults,
        },
        null,
        2
      )
    );

    logger.success(`All tests completed! Results saved to ${resultsFile}`);
    return resultsFile;
  } catch (error) {
    logger.error(`Error in generate and test process: ${error.message}`);
    throw error;
  }
}

/**
 * Test an existing character with multiple models
 */
async function testExistingWithMultipleModels(characterPath, selectedModels) {
  logger.start(
    `Testing existing character with ${selectedModels.length} models`
  );

  try {
    // Load the character
    const character = await loadCharacterFile(characterPath);
    logger.info(`Loaded character: [REDACTED]`);

    // Test with all selected models
    const testResults = await testWithMultipleModels(character, selectedModels);

    // Save the results
    const resultsDir = path.join(process.cwd(), "outputs", "test_results");
    await fs.mkdir(resultsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const characterName = path
      .basename(characterPath, ".json")
      .replace(/\s+/g, "_");

    const resultsFile = path.join(
      resultsDir,
      `[REDACTED]_multi_model_tests_${timestamp}.json`
    );

    await fs.writeFile(
      resultsFile,
      JSON.stringify(
        {
          character: {
            name: "[REDACTED]",
            path: characterPath,
          },
          models: selectedModels.map((m) => ({ name: m.name, id: m.model })),
          timestamp: new Date().toISOString(),
          results: testResults,
        },
        null,
        2
      )
    );

    logger.success(`All tests completed! Results saved to ${resultsFile}`);
    return resultsFile;
  } catch (error) {
    logger.error(`Error testing existing character: ${error.message}`);
    throw error;
  }
}

/**
 * Format and display the test results
 */
async function displayTestResults(resultsFile) {
  try {
    const results = JSON.parse(await fs.readFile(resultsFile, "utf8"));

    console.log("\n==========================");
    console.log(`MULTI-MODEL TEST RESULTS SUMMARY`);
    console.log("==========================\n");

    if (results.character) {
      console.log(`Character: [REDACTED]`);
    } else if (results.username) {
      console.log(`Username: [REDACTED]`);
    }

    console.log(
      `Models tested: ${results.models.map((m) => m.name).join(", ")}`
    );
    console.log(`Test timestamp: ${results.timestamp}`);
    console.log(`Results file: ${resultsFile}`);

    if (results.results) {
      console.log("\n=== Test Score Summary ===");

      if (results.character) {
        // Single character tested with multiple models
        const modelScores = {};

        results.results.forEach((result) => {
          if (result.summary) {
            modelScores[result.model] = result.summary;
          }
        });

        // Display the scores in a table-like format
        console.log("\nModel Performance (Single Character):");
        console.log(
          "-----------------------------------------------------------------------------------------"
        );
        console.log(
          "| Model                         | Reply Cosine | Reply Semantic | Post Cosine | Post Semantic |"
        );
        console.log(
          "-----------------------------------------------------------------------------------------"
        );

        for (const [model, scores] of Object.entries(modelScores)) {
          const replyCosineSim =
            scores.replies?.cosineSimilarity !== undefined
              ? (scores.replies.cosineSimilarity * 100).toFixed(2) + "%"
              : "N/A";

          const replySemanticSim =
            scores.replies?.semanticSimilarity !== undefined
              ? (scores.replies.semanticSimilarity * 100).toFixed(2) + "%"
              : "N/A";

          const postCosineSim =
            scores.posts?.cosineSimilarity !== undefined
              ? (scores.posts.cosineSimilarity * 100).toFixed(2) + "%"
              : "N/A";

          const postSemanticSim =
            scores.posts?.semanticSimilarity !== undefined
              ? (scores.posts.semanticSimilarity * 100).toFixed(2) + "%"
              : "N/A";

          console.log(
            `| ${model.padEnd(30)} | ${replyCosineSim.padEnd(12)} | ${replySemanticSim.padEnd(14)} | ${postCosineSim.padEnd(11)} | ${postSemanticSim.padEnd(13)} |`
          );
        }

        console.log(
          "-----------------------------------------------------------------------------------------"
        );
      } else {
        // Multiple characters tested with multiple models
        console.log("\nGenerated Character Performance:");
        console.log(
          "-----------------------------------------------------------------------------------------"
        );
        console.log(
          "| Generated By | Tested With | Reply Cosine | Reply Semantic | Post Cosine | Post Semantic |"
        );
        console.log(
          "-----------------------------------------------------------------------------------------"
        );

        results.results.forEach((genResult) => {
          genResult.testResults.forEach((testResult) => {
            if (testResult.summary) {
              const replyCosineSim =
                testResult.summary.replies?.cosineSimilarity !== undefined
                  ? (testResult.summary.replies.cosineSimilarity * 100).toFixed(
                      2
                    ) + "%"
                  : "N/A";

              const replySemanticSim =
                testResult.summary.replies?.semanticSimilarity !== undefined
                  ? (
                      testResult.summary.replies.semanticSimilarity * 100
                    ).toFixed(2) + "%"
                  : "N/A";

              const postCosineSim =
                testResult.summary.posts?.cosineSimilarity !== undefined
                  ? (testResult.summary.posts.cosineSimilarity * 100).toFixed(
                      2
                    ) + "%"
                  : "N/A";

              const postSemanticSim =
                testResult.summary.posts?.semanticSimilarity !== undefined
                  ? (testResult.summary.posts.semanticSimilarity * 100).toFixed(
                      2
                    ) + "%"
                  : "N/A";

              console.log(
                `| ${genResult.generatedBy.padEnd(12)} | ${testResult.model.padEnd(11)} | ${replyCosineSim.padEnd(12)} | ${replySemanticSim.padEnd(14)} | ${postCosineSim.padEnd(11)} | ${postSemanticSim.padEnd(13)} |`
              );
            }
          });
        });

        console.log(
          "-----------------------------------------------------------------------------------------"
        );
      }
    }

    console.log("\nDetailed results are available in the results file.");

    // Generate detailed results document
    await generateResultsDocument(resultsFile);
  } catch (error) {
    logger.error(`Error displaying test results: ${error.message}`);
  }
}

/**
 * Generate a detailed markdown document with all test results
 */
async function generateResultsDocument(resultsFile) {
  try {
    const results = JSON.parse(await fs.readFile(resultsFile, "utf8"));
    const docsDir = path.join(process.cwd(), "outputs", "docs");
    await fs.mkdir(docsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const docFile = path.join(
      docsDir,
      `test_results_${path.basename(resultsFile, ".json")}.md`
    );

    let mdContent = `# AI Model Testing Results\n\n`;
    mdContent += `Generated: ${new Date().toISOString()}\n\n`;

    if (results.character) {
      mdContent += `## Character: [REDACTED]\n\n`;
    } else if (results.username) {
      mdContent += `## Twitter Username: [REDACTED]\n\n`;
    }

    mdContent += `### Models Tested\n\n`;
    mdContent +=
      results.models.map((m) => `- ${m.name} (${m.id})`).join("\n") + "\n\n";

    // Summary Table
    mdContent += `## Performance Summary\n\n`;

    if (results.character) {
      // Single character tested with multiple models
      mdContent += `| Model | Reply Cosine | Reply Semantic | Post Cosine | Post Semantic |\n`;
      mdContent += `|-------|-------------|---------------|------------|-------------|\n`;

      results.results.forEach((result) => {
        if (result.summary) {
          const replyCosineSim =
            result.summary.replies?.cosineSimilarity !== undefined
              ? (result.summary.replies.cosineSimilarity * 100).toFixed(2) + "%"
              : "N/A";

          const replySemanticSim =
            result.summary.replies?.semanticSimilarity !== undefined
              ? (result.summary.replies.semanticSimilarity * 100).toFixed(2) +
                "%"
              : "N/A";

          const postCosineSim =
            result.summary.posts?.cosineSimilarity !== undefined
              ? (result.summary.posts.cosineSimilarity * 100).toFixed(2) + "%"
              : "N/A";

          const postSemanticSim =
            result.summary.posts?.semanticSimilarity !== undefined
              ? (result.summary.posts.semanticSimilarity * 100).toFixed(2) + "%"
              : "N/A";

          mdContent += `| ${result.model} | ${replyCosineSim} | ${replySemanticSim} | ${postCosineSim} | ${postSemanticSim} |\n`;
        }
      });
    } else {
      // Multiple characters tested with multiple models
      mdContent += `| Generated By | Tested With | Reply Cosine | Reply Semantic | Post Cosine | Post Semantic |\n`;
      mdContent += `|-------------|------------|-------------|---------------|------------|-------------|\n`;

      results.results.forEach((genResult) => {
        genResult.testResults.forEach((testResult) => {
          if (testResult.summary) {
            const replyCosineSim =
              testResult.summary.replies?.cosineSimilarity !== undefined
                ? (testResult.summary.replies.cosineSimilarity * 100).toFixed(
                    2
                  ) + "%"
                : "N/A";

            const replySemanticSim =
              testResult.summary.replies?.semanticSimilarity !== undefined
                ? (testResult.summary.replies.semanticSimilarity * 100).toFixed(
                    2
                  ) + "%"
                : "N/A";

            const postCosineSim =
              testResult.summary.posts?.cosineSimilarity !== undefined
                ? (testResult.summary.posts.cosineSimilarity * 100).toFixed(2) +
                  "%"
                : "N/A";

            const postSemanticSim =
              testResult.summary.posts?.semanticSimilarity !== undefined
                ? (testResult.summary.posts.semanticSimilarity * 100).toFixed(
                    2
                  ) + "%"
                : "N/A";

            mdContent += `| ${genResult.generatedBy} | ${testResult.model} | ${replyCosineSim} | ${replySemanticSim} | ${postCosineSim} | ${postSemanticSim} |\n`;
          }
        });
      });
    }

    // Detailed Results
    if (results.character) {
      // Single character tested with multiple models
      mdContent += `\n## Detailed Test Results\n\n`;

      results.results.forEach((modelResult) => {
        mdContent += `### Model: ${modelResult.model}\n\n`;

        // Reply Test Cases
        mdContent += `#### Reply Test Cases\n\n`;
        const replyResults = modelResult.results.filter(
          (r) => r.testType === "reply"
        );

        replyResults.forEach((result, idx) => {
          mdContent += `**Test Case ${idx + 1}:** ${result.testCase}\n\n`;
          mdContent += `**Response:**\n\`\`\`\n${result.response}\n\`\`\`\n\n`;

          if (result.similarityMetrics) {
            if (result.similarityMetrics.cosineSimilarity) {
              mdContent += `- Cosine Similarity: ${(result.similarityMetrics.cosineSimilarity.average * 100).toFixed(2)}% (avg), ${(result.similarityMetrics.cosineSimilarity.max * 100).toFixed(2)}% (max)\n`;
            }

            if (result.similarityMetrics.semanticSimilarity) {
              mdContent += `- Semantic Similarity: ${(result.similarityMetrics.semanticSimilarity * 100).toFixed(2)}%\n`;
            }

            if (result.similarityMetrics.mostSimilarExample) {
              mdContent += `\n**Most Similar Example (${(result.similarityMetrics.mostSimilarExample.similarity * 100).toFixed(2)}% similar):**\n`;
              mdContent += `\`\`\`\n${result.similarityMetrics.mostSimilarExample.text.substring(0, 300)}${result.similarityMetrics.mostSimilarExample.text.length > 300 ? "..." : ""}\n\`\`\`\n`;
            }
          }

          mdContent += `\n---\n\n`;
        });

        // Post Test Cases
        mdContent += `#### Post Test Cases\n\n`;
        const postResults = modelResult.results.filter(
          (r) => r.testType === "post"
        );

        postResults.forEach((result, idx) => {
          mdContent += `**Prompt ${idx + 1}:** ${result.promptText}\n\n`;
          mdContent += `**Generated Post:**\n\`\`\`\n${result.response}\n\`\`\`\n\n`;

          if (result.similarityMetrics) {
            if (result.similarityMetrics.cosineSimilarity) {
              mdContent += `- Cosine Similarity: ${(result.similarityMetrics.cosineSimilarity.average * 100).toFixed(2)}% (avg), ${(result.similarityMetrics.cosineSimilarity.max * 100).toFixed(2)}% (max)\n`;
            }

            if (result.similarityMetrics.semanticSimilarity) {
              mdContent += `- Semantic Similarity: ${(result.similarityMetrics.semanticSimilarity * 100).toFixed(2)}%\n`;
            }

            if (result.similarityMetrics.mostSimilarExample) {
              mdContent += `\n**Most Similar Example (${(result.similarityMetrics.mostSimilarExample.similarity * 100).toFixed(2)}% similar):**\n`;
              mdContent += `\`\`\`\n${result.similarityMetrics.mostSimilarExample.text.substring(0, 300)}${result.similarityMetrics.mostSimilarExample.text.length > 300 ? "..." : ""}\n\`\`\`\n`;
            }
          }

          mdContent += `\n---\n\n`;
        });
      });
    } else {
      // Multiple characters tested with multiple models
      results.results.forEach((genResult) => {
        mdContent += `\n## Character Generated By: ${genResult.generatedBy}\n\n`;

        genResult.testResults.forEach((modelResult) => {
          mdContent += `### Tested With: ${modelResult.model}\n\n`;

          // Reply Test Cases
          mdContent += `#### Reply Test Cases\n\n`;
          const replyResults = modelResult.results.filter(
            (r) => r.testType === "reply"
          );

          replyResults.forEach((result, idx) => {
            mdContent += `**Test Case ${idx + 1}:** ${result.testCase}\n\n`;
            mdContent += `**Response:**\n\`\`\`\n${result.response}\n\`\`\`\n\n`;

            if (result.similarityMetrics) {
              if (result.similarityMetrics.cosineSimilarity) {
                mdContent += `- Cosine Similarity: ${(result.similarityMetrics.cosineSimilarity.average * 100).toFixed(2)}% (avg), ${(result.similarityMetrics.cosineSimilarity.max * 100).toFixed(2)}% (max)\n`;
              }

              if (result.similarityMetrics.semanticSimilarity) {
                mdContent += `- Semantic Similarity: ${(result.similarityMetrics.semanticSimilarity * 100).toFixed(2)}%\n`;
              }

              if (result.similarityMetrics.mostSimilarExample) {
                mdContent += `\n**Most Similar Example (${(result.similarityMetrics.mostSimilarExample.similarity * 100).toFixed(2)}% similar):**\n`;
                mdContent += `\`\`\`\n${result.similarityMetrics.mostSimilarExample.text.substring(0, 300)}${result.similarityMetrics.mostSimilarExample.text.length > 300 ? "..." : ""}\n\`\`\`\n`;
              }
            }

            mdContent += `\n---\n\n`;
          });

          // Post Test Cases
          mdContent += `#### Post Test Cases\n\n`;
          const postResults = modelResult.results.filter(
            (r) => r.testType === "post"
          );

          postResults.forEach((result, idx) => {
            mdContent += `**Prompt ${idx + 1}:** ${result.promptText}\n\n`;
            mdContent += `**Generated Post:**\n\`\`\`\n${result.response}\n\`\`\`\n\n`;

            if (result.similarityMetrics) {
              if (result.similarityMetrics.cosineSimilarity) {
                mdContent += `- Cosine Similarity: ${(result.similarityMetrics.cosineSimilarity.average * 100).toFixed(2)}% (avg), ${(result.similarityMetrics.cosineSimilarity.max * 100).toFixed(2)}% (max)\n`;
              }

              if (result.similarityMetrics.semanticSimilarity) {
                mdContent += `- Semantic Similarity: ${(result.similarityMetrics.semanticSimilarity * 100).toFixed(2)}%\n`;
              }

              if (result.similarityMetrics.mostSimilarExample) {
                mdContent += `\n**Most Similar Example (${(result.similarityMetrics.mostSimilarExample.similarity * 100).toFixed(2)}% similar):**\n`;
                mdContent += `\`\`\`\n${result.similarityMetrics.mostSimilarExample.text.substring(0, 300)}${result.similarityMetrics.mostSimilarExample.text.length > 300 ? "..." : ""}\n\`\`\`\n`;
              }
            }

            mdContent += `\n---\n\n`;
          });
        });
      });
    }

    await fs.writeFile(docFile, mdContent);
    logger.success(`Detailed results document saved to: ${docFile}`);
    return docFile;
  } catch (error) {
    logger.error(`Error generating results document: ${error.message}`);
    return null;
  }
}

/**
 * Main function to run the multi-model tester
 */
async function main() {
  logger.start("Multi-Model Character Testing");

  try {
    // Check for Together API key
    if (!process.env.TOGETHER_API_KEY) {
      logger.error("TOGETHER_API_KEY environment variable is not set");
      process.exit(1);
    }

    // Ask what mode to run in
    const { mode } = await inquirer.prompt([
      {
        type: "list",
        name: "mode",
        message: "What would you like to do?",
        choices: [
          {
            name: "Test existing character with multiple models",
            value: "test-existing",
          },
          {
            name: "Generate and test character with multiple models",
            value: "generate-test",
          },
        ],
      },
    ]);

    // Select models to use
    const { selectedModelIndices } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedModelIndices",
        message: "Select which models to use (max 5):",
        choices: AVAILABLE_MODELS.map((model, index) => ({
          name: `${model.name} (${model.provider})`,
          value: index,
          checked: index < 5, // Default check first 5
        })),
        validate: (selections) => {
          if (selections.length === 0)
            return "Please select at least one model";
          if (selections.length > 5) return "Please select at most 5 models";
          return true;
        },
      },
    ]);

    const selectedModels = selectedModelIndices.map(
      (index) => AVAILABLE_MODELS[index]
    );

    if (mode === "test-existing") {
      // Find and select character file
      const files = await findCharacterFiles();

      if (files.length === 0) {
        logger.error("No character files found");
        process.exit(1);
      }

      const { selectedFile } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedFile",
          message: "Select a character file to test:",
          choices: files.map((file) => ({
            name: `${file.name} (${file.directory})`,
            value: file.path,
          })),
        },
      ]);

      // Run tests on existing character
      const resultsFile = await testExistingWithMultipleModels(
        selectedFile,
        selectedModels
      );

      // Display results
      await displayTestResults(resultsFile);
    } else {
      // Get username to scrape and generate
      const { username } = await inquirer.prompt([
        {
          type: "input",
          name: "username",
          message:
            "Enter Twitter username to scrape and generate character for:",
          validate: (input) =>
            input.trim().length > 0 ? true : "Username cannot be empty",
        },
      ]);

      // Generate and test
      const resultsFile = await generateAndTestWithMultipleModels(
        username,
        selectedModels
      );

      // Display results
      await displayTestResults(resultsFile);
    }

    logger.success("Multi-model testing completed!");
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();

// At the end of the file, after all the functions
// Add these exports to make the functions available to the CLI script

export {
  testExistingWithMultipleModels,
  generateAndTestWithMultipleModels,
  displayTestResults,
  generateResultsDocument,
  AVAILABLE_MODELS,
  SEMANTIC_SIM_MODEL,
  ALL_TEST_CASES,
};
