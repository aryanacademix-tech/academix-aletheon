import { Type, ThinkingLevel } from "@google/genai";
import { Puzzle } from "../types";

function checkRateLimit(error: any) {
  const errorString = String(error).toLowerCase();
  if (errorString.includes('429') || errorString.includes('quota') || errorString.includes('rate limit') || errorString.includes('rate_limit')) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('api_rate_limit_reached'));
    }
    throw new Error('RATE_LIMIT_REACHED');
  }
}

async function generateContentProxy(options: any) {
  try {
    const rateLimitEndsAt = localStorage.getItem('rateLimitEndsAt');
    if (rateLimitEndsAt && parseInt(rateLimitEndsAt) > Date.now()) {
      throw new Error('RATE_LIMIT_REACHED');
    }
  } catch(e) {
    if ((e as Error).message === 'RATE_LIMIT_REACHED') throw e;
  }

  // Retrieve API key from local storage
  let apiKey = '';
  try {
    const saved = localStorage.getItem('synapse_stats');
    if (saved) {
      const parsed = JSON.parse(saved);
      apiKey = parsed.apiKey || '';
      if (!apiKey && parsed.uid) {
        apiKey = `academix_google_key_${parsed.uid}`;
      }
    }
  } catch(e) {}

  if (!apiKey) {
    apiKey = 'academix_auto_key_default';
  }

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...options, apiKey }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401 || errorData.error === 'MISSING_API_KEY') {
      throw new Error('MISSING_API_KEY');
    }
    if (response.status === 429) {
      throw new Error('RATE_LIMIT_REACHED');
    }
    throw new Error(`API Error: ${response.statusText}`);
  }

  const data = await response.json();
  return { text: data.text };
}

export async function generatePuzzle(
  difficulty: string, 
  type: string,
  userContext?: { accuracy: number, averageTime: number, favoriteType: string }
): Promise<Puzzle> {
  let contextString = "";
  if (userContext) {
    contextString = `
    User Context for Adaptive Difficulty:
    - User Accuracy: ${(userContext.accuracy * 100).toFixed(1)}%
    - Average Solve Time: ${userContext.averageTime.toFixed(1)} seconds
    - Favorite Puzzle Type: ${userContext.favoriteType}
    
    Adapt the puzzle to this user. If accuracy is high (>70%) and time is fast (<30s), make it trickier within the '${difficulty}' tier. If accuracy is low (<40%), make the logic clearer and more straightforward. Try to incorporate elements of their favorite type (${userContext.favoriteType}) if possible.
    `;
  }

  const topics = [
    "quantum physics", "ancient history", "space exploration", "cryptography", 
    "biology", "computer science", "abstract mathematics", "daily life", 
    "music theory", "architecture", "culinary arts", "astronomy", 
    "cybersecurity", "genetics", "robotics", "economics", "linguistics"
  ];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  const timestamp = Date.now();

  let typeInstructions = "";
  if (type === 'mental math') {
    typeInstructions = "CRITICAL: This MUST be a pure numerical or symbolic mental math puzzle. DO NOT write a word problem. Use missing operators, chained rapid calculations, number grids, or algebraic substitution (e.g., 🍎 + 🍌 = 10). Make it visually clean and mathematically clever.";
  } else if (type === 'math' || type === 'basic operations & arithmetic') {
    typeInstructions = "CRITICAL: Focus on abstract mathematical concepts, geometry, or pure numbers. Create a tricky word problem or equation that tests order of operations, clever arithmetic, or hidden mathematical properties. Avoid standard textbook problems.";
  } else if (type === 'sequence' || type === 'pattern matching' || type === 'pattern recognition & number sequences') {
    typeInstructions = "CRITICAL: Focus on abstract patterns, number series, or symbolic sequences. Create a complex, non-obvious sequence that requires finding a hidden rule. Do not use simple arithmetic progressions.";
  } else if (type === 'geometric number puzzles') {
    typeInstructions = "CRITICAL: Describe a shape, grid, or diagram with numbers where the user must find the missing value based on spatial/mathematical relationships.";
  } else if (type === 'logical logic & spatial reasoning' || type === 'logic' || type === 'visual reasoning') {
    typeInstructions = "CRITICAL: Create a scenario requiring deep deduction, spatial manipulation in the mind, or multi-step logical inference.";
  } else if (type === 'missing number/letter puzzle') {
    typeInstructions = "CRITICAL: Provide a series, grid, or pattern with a missing element (?) and a clever logical rule connecting them.";
  } else {
    typeInstructions = "You may use a word problem, but keep it concise, highly engaging, and avoid classic tropes.";
  }

  const prompt = `Generate a completely unique, outstanding, and novel puzzle.
  Do NOT use classic, well-known, or cliché puzzles (e.g., no Monty Hall, no Einstein's riddle, no two trains).
  The puzzle must be entirely new, highly efficient in its wording, creative, mind-bending, and avoid repetition of standard formats.
  Make the user feel a sense of awe or "aha!" when they figure it out.
  
  Topic Inspiration: ${randomTopic}
  Random Seed: ${timestamp}
  Difficulty: ${difficulty}
  Type: ${type}
  ${contextString}
  
  ${typeInstructions}
  
  CRITICAL MATHEMATICAL & SYMBOL NOTATION RULES:
  1. Use clean, plain text for mathematical formulas, equations, and expressions (e.g., use +, -, ×, ÷, ^, √, =).
  2. DO NOT use raw LaTeX tags or commands (e.g. do NOT use \\frac, \\sqrt, \\times, \\cdot, etc.). Write fractions as a/b and square roots as √(x).
  3. CLEAR SYMBOL LEGEND: If any special, non-standard, or arithmetic operation symbol (such as *, ^, ⊕, ⊗, mod, !, #, or custom operators) is used in a problem, you MUST explicitly include a clear explanation or legend right inside the question text clarifying what the symbol demonstrates (e.g., "Note: '^' represents exponentiation (power)", "Note: 'a ⊕ b' means (a × b) + (a + b)", or "Note: 'mod' represents remainder after integer division").
  
  The puzzle should be challenging but logically sound and solvable.
  If it's a multiple choice question, provide exactly 4 options.
  If it's a direct input question, do not provide options.
  Make sure the answer is unambiguous.
  Provide a clear, step-by-step explanation for the solution.
  `;

  let modelName = "gemini-3.1-flash-lite-preview";
  let config: any = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "A unique identifier for the puzzle" },
        type: { type: Type.STRING, description: "The type of puzzle (e.g., logic, sequence, trick, math, geometric number puzzles, missing number/letter puzzle, etc.)" },
        difficulty: { type: Type.STRING, description: "The difficulty level" },
        question: { type: Type.STRING, description: "The puzzle question text" },
        options: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Optional: 4 multiple choice options. Leave empty if it's a direct input question."
        },
        answer: { type: Type.STRING, description: "The correct answer (must match one of the options if options are provided)" },
        explanation: { type: Type.STRING, description: "A step-by-step explanation of how to solve the puzzle" }
      },
      required: ["id", "type", "difficulty", "question", "answer", "explanation"]
    }
  };

  if (difficulty === 'extreme') {
    modelName = "gemini-3-flash-preview";
  }

  try {
    const response = await generateContentProxy({
      model: modelName,
      contents: prompt,
      config: config
    });

    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr) as Puzzle;
  } catch (e: any) {
    if (e.message === 'MISSING_API_KEY' ) throw e;
    checkRateLimit(e);
    if (e.message !== 'RATE_LIMIT_REACHED' && e.message !== 'MISSING_API_KEY') console.error("Failed to generate puzzle:", e);
    return {
      id: Date.now().toString(),
      type: "logic",
      difficulty: difficulty,
      question: "If you have a 3-gallon jug and a 5-gallon jug, how can you measure exactly 4 gallons of water?",
      answer: "Fill the 5, pour into 3 (leaving 2). Empty 3, pour the 2 into 3. Fill 5, pour 1 into 3 (leaving 4).",
      explanation: "This is a classic fallback puzzle. Fill the 5-gallon jug completely. Pour it into the 3-gallon jug until it's full. You now have 2 gallons left in the 5-gallon jug. Empty the 3-gallon jug. Pour the 2 gallons from the 5-gallon jug into the 3-gallon jug. Fill the 5-gallon jug completely again. Pour water from the 5-gallon jug into the 3-gallon jug until the 3-gallon jug is full (this will take exactly 1 gallon, since it already has 2 gallons in it). You now have exactly 4 gallons left in the 5-gallon jug."
    };
  }
}

export async function generateOutsideBoxPuzzle(): Promise<Puzzle> {
  const topics = [
    "deep sea biology", "forgotten 19th-century inventions", "bizarre astronomical phenomena",
    "unusual animal defense mechanisms", "ancient military tactics", "strange medical anomalies",
    "rare meteorological events", "cryptography in WWII", "obscure linguistic quirks",
    "the history of everyday objects", "weird psychological syndromes", "extreme survival stories",
    "ancient unsolved mysteries", "peculiar architectural flaws", "unexpected consequences of technology"
  ];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];

  const prompt = `Generate a 'Think Outside the Box' riddle based on a highly obscure, bizarre, but TRUE real-world fact, historical event, or scientific discovery.
  IMPORTANT: Focus the riddle loosely around the theme of: "${randomTopic}".
  
  Use Google Search to find something interesting and up-to-date related to this theme (or something completely random if you prefer, but it MUST be obscure), then turn it into a lateral thinking riddle.
  
  CRITICAL INSTRUCTION: Do NOT use classic riddles (no "Age", no "Time", no "Silence", no "A hole"). The riddle MUST be completely new, OUTSTANDING, engaging, and surprising. The user should feel a massive "aha!" moment when they read the answer.
  Do not use the same riddle twice.
  
  Return the result as a JSON object with the following structure:
  {
    "id": "unique-id-${Math.random()}",
    "type": "trick",
    "difficulty": "extreme",
    "question": "The tricky riddle question",
    "answer": "The short, correct answer",
    "explanation": "Explanation of why the answer is correct, citing the real-world fact"
  }
  Do not include any markdown formatting like \`\`\`json, just the raw JSON object.
  `;

  let response;
  try {
    response = await generateContentProxy({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
  } catch (e: any) {
    if (e.message === 'MISSING_API_KEY' ) throw e;
    checkRateLimit(e);
    if (e.message !== 'RATE_LIMIT_REACHED' && e.message !== 'MISSING_API_KEY') console.error("Failed to generate outside box puzzle:", e);
    return {
      id: Date.now().toString(),
      type: "trick",
      difficulty: "extreme",
      question: "I am something people love or hate. I change peoples appearances and thoughts. If a person takes care of themselves I will go up even higher. To some people I will fool them. To others I am a mystery. Some people might want to try and hide me but I will show. No matter how hard people try I will Never go down. What am I?",
      answer: "Age",
      explanation: "Age always goes up and never goes down, regardless of how you take care of yourself."
    };
  }

  let jsonStr = response.text?.trim() || "{}";
  if (jsonStr.startsWith("\`\`\`json")) {
    jsonStr = jsonStr.replace(/\`\`\`json\n?/, "").replace(/\`\`\`$/, "").trim();
  } else if (jsonStr.startsWith("\`\`\`")) {
    jsonStr = jsonStr.replace(/\`\`\`\n?/, "").replace(/\`\`\`$/, "").trim();
  }
  
  try {
    return JSON.parse(jsonStr) as Puzzle;
  } catch (e: any) {
    if (e.message === 'MISSING_API_KEY' ) throw e;
    checkRateLimit(e);
    if (e.message !== 'RATE_LIMIT_REACHED' && e.message !== 'MISSING_API_KEY') console.error("Failed to parse JSON for outside box puzzle:", jsonStr);
    // Fallback if JSON parsing fails
    return {
      id: Date.now().toString(),
      type: "trick",
      difficulty: "extreme",
      question: "I am something people love or hate. I change peoples appearances and thoughts. If a person takes care of themselves I will go up even higher. To some people I will fool them. To others I am a mystery. Some people might want to try and hide me but I will show. No matter how hard people try I will Never go down. What am I?",
      answer: "Age",
      explanation: "Age always goes up and never goes down, regardless of how you take care of yourself."
    };
  }
}

export async function getHint(puzzle: Puzzle, currentAttempt: string, hintLevel: number): Promise<string> {
  const prompt = `
  A user is stuck on this puzzle:
  Question: ${puzzle.question}
  Correct Answer: ${puzzle.answer}
  User's current attempt/thought: ${currentAttempt || "None"}
  
  Provide a hint for this puzzle.
  This is hint level ${hintLevel} (1 is a subtle nudge, 2 is more direct, 3 is almost giving it away).
  Do NOT give the final answer directly. Keep it concise, encouraging, and helpful.
  `;

  let modelName = "gemini-3.1-flash-lite-preview";
  let config: any = {};

  if (puzzle.difficulty === 'extreme') {
    modelName = "gemini-3-flash-preview";
  }

  try {
    const response = await generateContentProxy({
      model: modelName,
      contents: prompt,
      config: config
    });

    return response.text || "Think about the relationship between the numbers.";
  } catch (e: any) {
    if (e.message === 'MISSING_API_KEY' ) throw e;
    checkRateLimit(e);
    if (e.message !== 'RATE_LIMIT_REACHED' && e.message !== 'MISSING_API_KEY') console.error("Failed to generate hint:", e);
    return "Try to look at the problem from a different angle or break it down into smaller steps.";
  }
}

export async function evaluateLogic(puzzle: Puzzle, userAnswer: string, userLogic: string): Promise<{ isCorrect: boolean, feedback: string }> {
   const prompt = `
   Puzzle: ${puzzle.question}
   Correct Answer: ${puzzle.answer}
   User's Answer: ${userAnswer}
   User's Explanation/Logic: ${userLogic}

   Evaluate if the user's answer and logic are sound and lead to the correct answer.
   Sometimes users format their answer differently than the exact string. If their answer is mathematically or logically equivalent, mark it correct.
   If their logic is sound but they made a tiny calculation error, you can decide whether to mark it correct or incorrect based on the severity.
   `;

   let modelName = "gemini-3.1-flash-lite-preview";
   let config: any = {
     responseMimeType: "application/json",
     responseSchema: {
       type: Type.OBJECT,
       properties: {
         isCorrect: { type: Type.BOOLEAN, description: "True if the answer/logic is fundamentally correct." },
         feedback: { type: Type.STRING, description: "Constructive feedback on their answer and logic. Be encouraging." }
       },
       required: ["isCorrect", "feedback"]
     }
   };

   if (puzzle.difficulty === 'extreme') {
     modelName = "gemini-3-flash-preview";
   }

   try {
     const response = await generateContentProxy({
      model: modelName,
      contents: prompt,
      config: config
    });

    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr);
   } catch (e: any) {
     if (e.message === 'MISSING_API_KEY' ) throw e;
     checkRateLimit(e);
     if (e.message !== 'RATE_LIMIT_REACHED' && e.message !== 'MISSING_API_KEY') console.error("Failed to evaluate logic:", e);
     // Fallback evaluation
     const isCorrect = userAnswer.toLowerCase().includes(puzzle.answer.toLowerCase());
     return {
       isCorrect,
       feedback: isCorrect ? "Correct! Good job." : "That doesn't seem quite right. Try again!"
     };
   }
}
