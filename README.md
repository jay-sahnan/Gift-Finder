# 🎁 Gift Finder - AI-Powered Gift Discovery with Stagehand

This project automates intelligent gift finding using [Stagehand](https://github.com/browserbase/stagehand), an SDK for browser automation built on top of Playwright. It uses AI to generate smart search queries, browse gift websites, and score products based on recipient profiles.

## Features

- **AI-Generated Search Queries**: Uses GPT-4o to create intelligent, targeted search terms based on recipient profile
- **Concurrent Web Browsing**: Runs multiple browser sessions simultaneously for faster results
- **Smart Product Scoring**: AI-powered scoring system that evaluates gifts based on recipient interests and relationship
- **Interactive CLI**: Beautiful command-line interface with styled prompts and results
- **Live Browser Sessions**: Watch the automation in real-time via Browserbase
- **Intelligent Filtering**: Focuses on complementary items rather than obvious basics
- **Multi-Platform Search**: Searches across gift websites for comprehensive results

## Gift Finding Logic

The script uses an intelligent multi-step process:
- **Profile Analysis**: Analyzes recipient type and description to understand interests
- **Query Generation**: Creates 3 targeted search queries that avoid obvious basics
- **Concurrent Search**: Runs multiple browser sessions simultaneously for efficiency
- **Product Extraction**: Scrapes product details including title, price, rating, and URL
- **AI Scoring**: Uses GPT-4o to score each product (1-10) based on:
  - How well it matches their interests/hobbies
  - Appropriateness for the relationship
  - Value for money
  - Uniqueness/thoughtfulness
  - Practical usefulness
- **Smart Ranking**: Displays top 3 recommendations with detailed reasoning

For each search, the script:
1. Generates intelligent search queries based on recipient profile
2. Opens concurrent browser sessions to Firebox.eu
3. Performs targeted searches for each query
4. Extracts product information (title, price, rating, URL)
5. Scores all products using AI analysis
6. Ranks and displays the top recommendations

## Setting the Stage

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env && nano .env
```

Required environment variables:
- `BROWSERBASE_PROJECT_ID`: Your Browserbase project ID
- `BROWSERBASE_API_KEY`: Your Browserbase API key
- `OPENAI_API_KEY`: Your OpenAI API key (for AI-powered search generation and scoring)

## Curtain Call

Run the gift finder automation:

```bash
npm start
```

The script will:
1. Display a welcome message with styled interface
2. Prompt you to select the recipient type (Mum, Dad, Sister, Brother, Friend, Boss)
3. Ask for a description of the recipient (interests, hobbies, age, etc.)
4. Generate 3 intelligent search queries using AI
5. Open multiple browser sessions (watch live via Browserbase URLs)
6. Search Firebox.eu for each query concurrently
7. Extract product information from search results
8. Score all products using AI analysis
9. Display the top 3 recommended gifts with detailed reasoning

## Development

### Build TypeScript

```bash
npm run build
```

### Run on Local Browser

To run on a local browser instead of Browserbase, change `env: "BROWSERBASE"` to `env: "LOCAL"` in the `index.ts` file.

## About Stagehand

Stagehand is an SDK for automating browsers with AI capabilities. It's built on top of [Playwright](https://playwright.dev/) and provides a higher-level API for better debugging and AI fail-safes.

Key features used in this project:
- `page.act()`: Perform natural language actions on web pages (typing in search, clicking buttons)
- `page.extract()`: Extract structured data from web pages (product information, pricing)
- `page.goto()`: Navigate to websites
- Concurrent browser sessions for parallel processing

## What's Next?

- **Multiple Gift Sites**: Add support for searching across multiple gift websites
- **Price Range Filtering**: Add budget constraints and price range preferences
- **Gift Categories**: Add category-based filtering (tech, home, fashion, etc.)
- **Wishlist Integration**: Connect with popular wishlist services
- **Gift History**: Track previously recommended gifts to avoid duplicates
- **Seasonal Recommendations**: Add holiday and occasion-specific suggestions
- **Social Features**: Share recommendations with friends and family
- **Gift Tracking**: Track if gifts were purchased and recipient satisfaction
- **Custom Search Sites**: Allow users to add their own preferred gift websites
- **Bulk Recommendations**: Generate multiple gift options for different recipients

## Requirements

- Node.js 16+
- Browserbase account
- OpenAI API key
- Internet connection for web browsing

## Troubleshooting

If you encounter issues:
1. Ensure all environment variables are set correctly
2. Check that your Browserbase and OpenAI API keys are active
3. Verify your internet connection is stable
4. Watch the live browser sessions for debugging
5. Check if the target website (Firebox.eu) is accessible
6. Ensure you have sufficient OpenAI API credits for AI operations
