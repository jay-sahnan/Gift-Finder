import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import inquirer from "inquirer";
import boxen from "boxen";
import chalk from "chalk";
import OpenAI from "openai";
import { z } from "zod";

/**
 * Interface for user input answers from the CLI prompts
 */
interface GiftFinderAnswers {
  /** The type of recipient (Mum, Dad, Sister, Brother, Friend, Boss) */
  recipient: string;
  /** Description of the recipient including interests, hobbies, age, etc. */
  description: string;
}

/**
 * Interface for product data extracted from web pages
 */
interface Product {
  /** The title/name of the product */
  title: string;
  /** The full URL link to the product page */
  url: string;
  /** The price of the product (including currency symbol) */
  price: string;
  /** The star rating or number of reviews */
  rating: string;
  /** AI-generated score from 1-10 */
  aiScore?: number;
  /** AI-generated reason for the score */
  aiReason?: string;
}

/**
 * Interface for search results from a single browser session
 */
interface SearchResult {
  /** The search query that was used */
  query: string;
  /** The session index number */
  sessionIndex: number;
  /** Array of products found in this search */
  products: Product[];
}

// Initialize OpenAI client
const client = new OpenAI();

/**
 * STEP 1: Generate intelligent search queries using AI
 * 
 * This function uses GPT-4o to analyze the recipient's profile and generate
 * 3 targeted search queries that focus on complementary items rather than
 * obvious basics. The AI is instructed to think creatively about gifts that
 * enhance existing hobbies or provide thoughtful upgrades.
 * 
 * @param recipient - The type of recipient (Mum, Dad, Sister, etc.)
 * @param description - Description of the recipient's interests and hobbies
 * @returns Promise<string[]> - Array of 3 search query strings
 * 
 * @example
 * ```typescript
 * const queries = await generateSearchQueries("Dad", "loves cooking and grilling");
 * // Returns: ["spice rack", "chef knife", "herb garden"]
 * ```
 */
async function generateSearchQueries(recipient: string, description: string): Promise<string[]> {
  console.log(chalk.gray(`🤖 Generating search queries for ${recipient}...`));
  
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: `Generate exactly 3 short gift search queries (1-2 words each) for finding gifts for a ${recipient.toLowerCase()} who is described as: "${description}". 

IMPORTANT: Assume they already have the basic necessities related to their interests. Focus on:
- Complementary items that enhance their hobbies
- Thoughtful accessories or upgrades
- Related but unexpected items
- Premium or unique versions of things they might not buy themselves

AVOID obvious basics like "poker set" for poker players, "dumbbells" for fitness enthusiasts, etc.

Examples for "loves cooking":
spice rack
chef knife
herb garden

Return ONLY the search terms, one per line, no dashes, bullets, or numbers. Just the plain search terms:`
    }],
    max_completion_tokens: 1000,
  });

  // Parse and clean the response
  const queries = response.choices[0]?.message?.content?.trim().split('\n').filter(q => q.trim()) || [];
  return queries.slice(0, 3); // Ensure we only get 3 queries
}

/**
 * STEP 5: Score products using AI analysis
 * 
 * This function uses GPT-4o to analyze each product and score it from 1-10
 * based on how well it matches the recipient's profile. The AI considers
 * multiple factors including interests, relationship appropriateness, value,
 * uniqueness, and practical usefulness.
 * 
 * @param products - Array of products to score
 * @param recipient - The type of recipient (Mum, Dad, Sister, etc.)
 * @param description - Description of the recipient's interests and hobbies
 * @returns Promise<Product[]> - Array of products with AI scores and reasoning
 * 
 * @example
 * ```typescript
 * const scoredProducts = await scoreProducts(products, "Dad", "loves cooking");
 * // Returns products with aiScore and aiReason properties
 * ```
 */
async function scoreProducts(products: Product[], recipient: string, description: string): Promise<Product[]> {
  console.log(chalk.bold.magenta("🤖 AI is analyzing gift options based on recipient profile..."));
  
  const allProducts = products.flat();
  
  if (allProducts.length === 0) {
    console.log(chalk.yellow("⚠️ No products to score"));
    return [];
  }

  // Format products for AI analysis
  const productList = allProducts.map((product, index) => 
    `${index + 1}. ${product.title} - ${product.price} - ${product.rating}`
  ).join('\n');

  console.log(chalk.gray(`📊 Scoring ${allProducts.length} products...`));

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: `You are a gift recommendation expert. Score each product based on how well it matches the recipient profile.

RECIPIENT: ${recipient}
DESCRIPTION: ${description}

PRODUCTS TO SCORE:
${productList}

For each product, provide a score from 1-10 (10 being perfect match) and a brief reason. Consider:
- How well it matches their interests/hobbies
- Appropriateness for the relationship (${recipient.toLowerCase()})
- Value for money
- Uniqueness/thoughtfulness
- Practical usefulness

Return ONLY a valid JSON array (no markdown, no code blocks) with this exact format:
[
  {
    "productIndex": 1,
    "score": 8,
    "reason": "Perfect for poker enthusiasts, high quality chips enhance the gaming experience"
  },
  {
    "productIndex": 2,
    "score": 6,
    "reason": "Useful but basic, might already own similar item"
  }
]

IMPORTANT: 
- Return raw JSON only, no code blocks
- Include all ${allProducts.length} products
- Keep reasons under 100 characters
- Use productIndex 1-${allProducts.length}`
    }],
    max_completion_tokens: 1000,
  });

  try {
    let responseContent = response.choices[0]?.message?.content?.trim() || '[]';
    
    // Remove markdown code blocks if present
    responseContent = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    const scoresData = JSON.parse(responseContent);
    
    // Combine products with their scores
    const scoredProducts = allProducts.map((product, index) => {
      const scoreInfo = scoresData.find((s: any) => s.productIndex === index + 1);
      return {
        ...product,
        aiScore: scoreInfo?.score || 0,
        aiReason: scoreInfo?.reason || "No scoring available"
      };
    });

    // Sort by AI score (highest first)
    return scoredProducts.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
    
  } catch (error) {
    console.error(chalk.red("❌ Error parsing AI scores:", error));
    console.log(chalk.yellow("⚠️ Using fallback scoring (all products scored as 5)"));
    
    // Fallback: return products with neutral scores
    return allProducts.map(product => ({
      ...product,
      aiScore: 5,
      aiReason: "Scoring failed - using neutral score"
    }));
  }
}

/**
 * STEP 0: Get user input through interactive CLI
 * 
 * This function displays a welcome message and prompts the user for:
 * 1. The type of recipient (Mum, Dad, Sister, Brother, Friend, Boss)
 * 2. A description of the recipient's interests, hobbies, and characteristics
 * 
 * The input is validated to ensure we have enough information to generate
 * meaningful search queries and product recommendations.
 * 
 * @returns Promise<GiftFinderAnswers> - User input containing recipient type and description
 * 
 * @example
 * ```typescript
 * const answers = await getUserInput();
 * // Returns: { recipient: "Dad", description: "loves cooking and grilling" }
 * ```
 */
async function getUserInput(): Promise<GiftFinderAnswers> {
  // Display welcome message with styled box
  const welcomeMessage = chalk.bold.cyan("🎁 Welcome to the Gift Finder App! 🎁");
  const subtitle = chalk.gray("Find the perfect gift with intelligent web browsing");
  
  console.log(boxen(`${welcomeMessage}\n${subtitle}`, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
    backgroundColor: '#001122'
  }));
  
  // Prompt user for recipient information
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'recipient',
      message: 'Who are you buying a gift for?',
      choices: [
        'Mum',
        'Dad', 
        'Sister',
        'Brother',
        'Friend',
        'Boss'
      ]
    },
    {
      type: 'input',
      name: 'description',
      message: 'Please provide a short description about them (interests, hobbies, age, etc.):',
      validate: (input: string) => {
        if (input.trim().length < 5) {
          return 'Please provide at least 5 characters for a better gift recommendation.';
        }
        return true;
      }
    }
  ]);

  return answers as GiftFinderAnswers;
}

/**
 * Main application function that orchestrates the entire gift finding process
 * 
 * This function coordinates all the steps:
 * 1. Get user input (recipient type and description)
 * 2. Generate AI-powered search queries
 * 3. Run concurrent browser searches
 * 4. Extract product information
 * 5. Score products using AI analysis
 * 6. Display top recommendations
 * 
 * @returns Promise<void>
 */
async function main(): Promise<void> {
  console.log(chalk.bold.cyan("🎁 Starting Gift Finder Application..."));
  
  // STEP 0: Get user input first
  const { recipient, description } = await getUserInput();
  console.log(chalk.green(`✅ User input received: ${recipient} - ${description}`));

  // STEP 1: Generate intelligent search queries using AI
  console.log(chalk.bold.magenta("\n🤖 Generating intelligent search queries..."));
  
  let searchQueries: string[];
  try {
    searchQueries = await generateSearchQueries(recipient, description);
    
    // Display the generated queries with styling
    console.log(chalk.bold.yellow("\n🔍 Generated Search Queries:"));
    searchQueries.forEach((query, index) => {
      console.log(chalk.green(`   ${index + 1}. ${chalk.bold(query.replace(/['"]/g, ''))}`));
    });
    
  } catch (error) {
    console.error(chalk.red("❌ Error generating search queries:", error));
    // Fallback to default queries
    searchQueries = ["gifts", "accessories", "items"];
    console.log(chalk.yellow("⚠️ Using fallback search queries"));
  }
  
  console.log(chalk.bold.magenta("\n🚀 Starting concurrent browser searches..."));
  
  /**
   * STEP 2-4: Run a single browser search session
   * 
   * This function creates a new Stagehand browser session, navigates to the gift website,
   * performs a search, and extracts product information. Each search runs in its own
   * browser session to enable concurrent processing.
   * 
   * @param query - The search query to execute
   * @param sessionIndex - The index of this session (for logging purposes)
   * @returns Promise<SearchResult> - Search results containing products found
   * 
   * @example
   * ```typescript
   * const result = await runSingleSearch("spice rack", 0);
   * // Returns: { query: "spice rack", sessionIndex: 1, products: [...] }
   * ```
   */
  async function runSingleSearch(query: string, sessionIndex: number): Promise<SearchResult> {
    console.log(chalk.gray(`🔍 Starting search session ${sessionIndex + 1} for: "${query}"`));
    
    // Create a new Stagehand instance for this session
    const sessionStagehand = new Stagehand({
      env: "BROWSERBASE",
      experimental: true,
      modelName: "gpt-4o",
      browserbaseSessionCreateParams: {
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
        proxies: true,
        region: "us-east-1",
        timeout: 900,
        keepAlive: false,
        browserSettings: {
          advancedStealth: false,
          blockAds: true,
          solveCaptchas: true,
          viewport: {
            width: 1920,
            height: 1080,
          },
        },
      }
    });

    try {
      // Initialize the browser session
      await sessionStagehand.init();
      const sessionPage = sessionStagehand.page;
      
      // Log the live view link for this browser session
      const sessionId = sessionStagehand.browserbaseSessionID;
      if (sessionId) {
        const liveViewUrl = `https://www.browserbase.com/sessions/${sessionId}`;
        console.log(chalk.blue(`🌐 Session ${sessionIndex + 1} Live View: ${liveViewUrl}`));
      }
      
      // STEP 2: Navigate to the gift website
      console.log(chalk.gray(`📱 Session ${sessionIndex + 1}: Navigating to Firebox.eu...`));
      await sessionPage.goto("https://firebox.eu/");
      
      // STEP 3: Perform the search
      console.log(chalk.gray(`🔍 Session ${sessionIndex + 1}: Searching for "${query}"...`));
      await sessionPage.act(`Type ${query} into the search bar`);
      await sessionPage.act("Click the search button");
      await sessionPage.waitForTimeout(1000); // Wait for results to load
      
      // STEP 4: Extract product information
      console.log(chalk.gray(`📊 Session ${sessionIndex + 1}: Extracting product data...`));
      const productsData = await sessionPage.extract({
        instruction: "Extract the first 3 products from the search results",
        schema: z.object({
          products: z.array(z.object({
            title: z.string().describe("the title/name of the product"),
            url: z.string().url("the full URL link to the product page"),
            price: z.string().describe("the price of the product (include currency symbol)"),
            rating: z.string().describe("the star rating or number of reviews (e.g., '4.5 stars' or '123 reviews')")
          })).max(3).describe("array of the first 3 products from search results")
        })
      });

      console.log(chalk.green(`✅ Session ${sessionIndex + 1}: Found ${productsData.products.length} products for "${query}"`));
      
      // Clean up the browser session
      await sessionStagehand.close();
      
      return {
        query,
        sessionIndex: sessionIndex + 1,
        products: productsData.products
      };
      
    } catch (error) {
      console.error(chalk.red(`❌ Session ${sessionIndex + 1} failed:`, error));
      
      // Ensure browser session is closed even on error
      try {
        await sessionStagehand.close();
      } catch (closeError) {
        console.error(chalk.red(`❌ Error closing session ${sessionIndex + 1}:`, closeError));
      }
      
      return {
        query,
        sessionIndex: sessionIndex + 1,
        products: []
      };
    }
  }

  // STEP 2-4: Run all searches concurrently
  const searchPromises = searchQueries.map((query, index) => runSingleSearch(query, index));
  
  console.log(chalk.bold.cyan("\n🌐 Browser Sessions Starting..."));
  console.log(chalk.gray("Live view links will appear as each session initializes"));
  
  // Wait for all searches to complete
  const allResults = await Promise.all(searchPromises);
  
  // STEP 5: Process and display results
  const totalProducts = allResults.reduce((sum, result) => sum + result.products.length, 0);
  console.log(chalk.bold.green(`\n🎉 Total products found: ${totalProducts} across ${searchQueries.length} searches`));

  // Flatten all products from all searches
  const allProductsFlat = allResults.flatMap(result => result.products);
  
  if (allProductsFlat.length > 0) {
    try {
      // STEP 5: Score all products using AI analysis
      const scoredProducts = await scoreProducts(allProductsFlat, recipient, description);
      const top3Products = scoredProducts.slice(0, 3);

      // STEP 6: Display top recommendations with beautiful formatting
      console.log(chalk.bold.yellow("\n🏆 TOP 3 RECOMMENDED GIFTS:"));
      
      top3Products.forEach((product, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
        const productInfo = `${medal} ${chalk.bold.cyan(`#${index + 1} - ${product.title}`)}
${chalk.yellow(`💰 Price: ${product.price}`)}
${chalk.magenta(`⭐ Rating: ${product.rating}`)}
${chalk.green(`🎯 Score: ${product.aiScore}/10`)}
${chalk.gray(`💭 Why: ${product.aiReason}`)}
${chalk.blue(`🔗 Link: ${product.url}`)}`;

        console.log(boxen(productInfo, {
          padding: 1,
          margin: 1,
          borderStyle: 'double',
          borderColor: index === 0 ? 'yellow' : index === 1 ? 'white' : 'cyan',
          backgroundColor: index === 0 ? '#332200' : '#001122'
        }));
      });

      // Display summary
      console.log(chalk.bold.green(`\n✨ Gift finding complete! Found ${totalProducts} products, analyzed ${scoredProducts.length} with AI.`));
      
    } catch (error) {
      console.error(chalk.red("❌ Error scoring products:", error));
      console.log(chalk.cyan(`📋 Target: ${chalk.bold(recipient)}`));
      console.log(chalk.cyan(`📝 Profile: ${chalk.italic(description)}`));
    }
  } else {
    console.log(chalk.red("❌ No products found to score"));
    console.log(chalk.yellow("💡 Try adjusting your recipient description or check if the website is accessible"));
  }

  console.log(chalk.bold.cyan("\n🎁 Thank you for using Gift Finder!"));
}

// Error handling for the main application
main().catch((err) => {
  console.error(chalk.red("💥 Application error:"), err);
  console.log(chalk.yellow("💡 Check your environment variables and internet connection"));
  process.exit(1);
});
