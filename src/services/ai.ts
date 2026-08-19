import { Type } from "@google/genai";
import { Puzzle } from "../types";

function checkRateLimit(error: any) {
  const errorString = String(error).toLowerCase();
  if (errorString.includes('429') || errorString.includes('quota') || errorString.includes('rate limit') || errorString.includes('rate_limit')) {
    throw new Error('RATE_LIMIT_REACHED');
  }
}

async function generateContentProxy(options: any) {
  // Retrieve API key from local storage
  let apiKey = '';
  try {
    const saved = localStorage.getItem('synapse_stats');
    if (saved) {
      const parsed = JSON.parse(saved);
      apiKey = parsed.apiKey || '';
    }
  } catch(e) {}

  let response: Response | null = null;
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...options, apiKey }),
      });

      if (response.status === 429 && attempts < maxAttempts) {
        // Wait 1.2 seconds before 1 client-side retry
        await new Promise(res => setTimeout(res, 1200));
        continue;
      }
      break;
    } catch (err) {
      if (attempts >= maxAttempts) throw err;
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  if (!response || !response.ok) {
    const errorData = await response?.json().catch(() => ({})) || {};
    if (response?.status === 401 || errorData.error === 'MISSING_API_KEY' || errorData.error === 'INVALID_API_KEY') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('missing_api_key_requested', { detail: { message: errorData.message } }));
      }
      throw new Error('MISSING_API_KEY');
    }
    if (response?.status === 429 || errorData.error === 'RATE_LIMIT_REACHED') {
      throw new Error('RATE_LIMIT_REACHED');
    }
    throw new Error(`API Error: ${response?.statusText || 'Request failed'}`);
  }

  // Clear rate limit state on successful response
  try {
    localStorage.removeItem('rateLimitEndsAt');
  } catch (e) {}

  const data = await response.json();
  return { text: data.text };
}

// Fallback Puzzle Library for seamless offline/rate-limited operation
const FALLBACK_PUZZLES: Puzzle[] = [
  {
    id: "fb-1",
    type: "mental math",
    difficulty: "easy",
    question: "Solve for the missing value: 12 + ? × 3 = 30 (Note: Apply standard order of operations: multiplication first).",
    options: ["4", "6", "8", "10"],
    answer: "6",
    explanation: "Using order of operations: 12 + (? × 3) = 30. Subtract 12 from both sides to get ? × 3 = 18. Divide by 3 to find ? = 6."
  },
  {
    id: "fb-2",
    type: "logic",
    difficulty: "medium",
    question: "If 5 cats can catch 5 mice in 5 minutes, how many minutes does it take 100 cats to catch 100 mice?",
    options: ["5 minutes", "20 minutes", "100 minutes", "50 minutes"],
    answer: "5 minutes",
    explanation: "If 5 cats catch 5 mice in 5 minutes, each cat takes 5 minutes to catch 1 mouse. Thus, 100 cats working simultaneously will catch 100 mice in 5 minutes."
  },
  {
    id: "fb-3",
    type: "sequence",
    difficulty: "medium",
    question: "Find the next number in the sequence: 2, 6, 12, 20, 30, ?",
    options: ["40", "42", "44", "46"],
    answer: "42",
    explanation: "The differences between consecutive terms increase by 2: (+4, +6, +8, +10, +12). 30 + 12 = 42. Alternatively, n × (n + 1): 1×2=2, 2×3=6, 3×4=12, 4×5=20, 5×6=30, 6×7=42."
  },
  {
    id: "fb-4",
    type: "math",
    difficulty: "hard",
    question: "A mother is 3 times as old as her daughter. In 12 years, she will be twice as old as her daughter. How old is the daughter today?",
    options: ["10", "12", "14", "16"],
    answer: "12",
    explanation: "Let daughter's age = d. Mother's age = 3d. In 12 years: 3d + 12 = 2(d + 12) => 3d + 12 = 2d + 24 => d = 12."
  },
  {
    id: "fb-5",
    type: "missing number/letter puzzle",
    difficulty: "medium",
    question: "Complete the pattern: 3, 5, 9, 17, 33, ?",
    options: ["49", "57", "65", "73"],
    answer: "65",
    explanation: "Each term doubles the previous addition (+2, +4, +8, +16, +32). 33 + 32 = 65. Or (Previous × 2) - 1: (33 × 2) - 1 = 65."
  },
  {
    id: "fb-6",
    type: "logic",
    difficulty: "extreme",
    question: "A man is looking at a portrait and says, 'Brothers and sisters I have none, but that man's father is my father's son.' Who is in the portrait?",
    options: ["His father", "His son", "Himself", "His nephew"],
    answer: "His son",
    explanation: "'My father's son' with no siblings means the speaker himself. So 'that man's father is me', meaning the portrait is of his son."
  }
];

export function getFallbackPuzzle(difficulty: string, type: string): Puzzle {
  const matching = FALLBACK_PUZZLES.filter(p => 
    p.difficulty.toLowerCase() === difficulty.toLowerCase() || 
    p.type.toLowerCase().includes(type.toLowerCase())
  );
  const pool = matching.length > 0 ? matching : FALLBACK_PUZZLES;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return {
    ...picked,
    id: `fb-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  };
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

  let modelName = "gemini-2.5-flash";
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
    modelName = "gemini-2.5-flash";
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
    console.warn("Using fallback puzzle due to API state:", e.message);
    return getFallbackPuzzle(difficulty, type);
  }
}

export async function generateBatchPuzzles(
  count: number = 5,
  difficulty: string = 'mixed',
  statsContext: { accuracy?: number; averageTime?: number; favoriteType?: string } = {}
): Promise<Puzzle[]> {
  const contextString = statsContext.accuracy !== undefined 
    ? `User Context: Historical Accuracy = ${(statsContext.accuracy * 100).toFixed(0)}%, Avg Solve Time = ${statsContext.averageTime || 60}s.`
    : '';

  const prompt = `Generate a batch of exactly ${count} completely unique, outstanding, and novel math & logic puzzles.
  Do NOT use classic, well-known, or cliché puzzles (e.g. no Monty Hall, no Einstein's riddle, no two trains).
  Make each puzzle distinct in question type (logic, mental math, sequence, pattern matching, trick, missing number puzzle, arithmetic, geometric number puzzles).
  
  Session Difficulty Preference: ${difficulty}
  ${contextString}
  
  CRITICAL MATHEMATICAL & SYMBOL NOTATION RULES:
  1. Use clean, plain text for mathematical formulas, equations, and expressions (e.g., use +, -, ×, ÷, ^, √, =).
  2. DO NOT use raw LaTeX tags or commands.
  3. CLEAR SYMBOL LEGEND: If any special, non-standard, or arithmetic operation symbol (such as *, ^, ⊕, ⊗, mod, !, #, or custom operators) is used in a problem, you MUST explicitly include a clear explanation or legend right inside the question text.
  
  Return a JSON array containing exactly ${count} puzzle objects.
  If a puzzle is multiple choice, provide exactly 4 options. If direct input, set options to an empty array.
  Make sure each answer is unambiguous and provide a clear step-by-step explanation.`;

  let config: any = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.ARRAY,
      description: `A list of ${count} distinct math and logic puzzles`,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "A unique identifier" },
          type: { type: Type.STRING, description: "The type of puzzle" },
          difficulty: { type: Type.STRING, description: "Difficulty level" },
          question: { type: Type.STRING, description: "The question text" },
          options: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "4 multiple choice options, or empty array if direct input"
          },
          answer: { type: Type.STRING, description: "Correct answer" },
          explanation: { type: Type.STRING, description: "Step by step explanation" }
        },
        required: ["id", "type", "difficulty", "question", "answer", "explanation"]
      }
    }
  };

  try {
    const response = await generateContentProxy({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: config
    });

    let jsonStr = response.text?.trim() || "[]";
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/```json\n?/, "").replace(/```$/, "").trim();
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```\n?/, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const resultPuzzles = [...parsed];
      const diffs = ['beginner', 'intermediate', 'hard', 'super hard', 'extreme'];
      const types = ['logic', 'math', 'sequence', 'pattern matching', 'trick'];
      while (resultPuzzles.length < count) {
        const fallback = getFallbackPuzzle(
          diffs[resultPuzzles.length % diffs.length], 
          types[resultPuzzles.length % types.length]
        );
        resultPuzzles.push(fallback);
      }
      return resultPuzzles.slice(0, count);
    }
    throw new Error('Invalid batch JSON response');
  } catch (e: any) {
    if (e.message === 'MISSING_API_KEY') throw e;
    console.warn("Using fallback puzzle batch due to API state:", e.message);
    const fallbackBatch: Puzzle[] = [];
    const diffs = ['beginner', 'intermediate', 'hard', 'super hard', 'extreme'];
    const types = ['logic', 'math', 'sequence', 'pattern matching', 'trick'];
    for (let i = 0; i < count; i++) {
      fallbackBatch.push(getFallbackPuzzle(diffs[i % diffs.length], types[i % types.length]));
    }
    return fallbackBatch;
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
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
  } catch (e: any) {
    if (e.message === 'MISSING_API_KEY' ) throw e;
    console.warn("Using fallback outside-the-box puzzle due to API state:", e.message);
    return getFallbackPuzzle('extreme', 'trick');
  }

  let jsonStr = response.text?.trim() || "{}";
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.replace(/```json\n?/, "").replace(/```$/, "").trim();
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/```\n?/, "").replace(/```$/, "").trim();
  }
  
  try {
    return JSON.parse(jsonStr) as Puzzle;
  } catch (e: any) {
    if (e.message === 'MISSING_API_KEY' ) throw e;
    return getFallbackPuzzle('extreme', 'trick');
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

  let modelName = "gemini-2.5-flash";
  let config: any = {};

  if (puzzle.difficulty === 'extreme') {
    modelName = "gemini-2.5-flash";
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

   let modelName = "gemini-2.5-flash";
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
     modelName = "gemini-2.5-flash";
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
     // Fallback evaluation
     const isCorrect = userAnswer.toLowerCase().includes(puzzle.answer.toLowerCase());
     return {
       isCorrect,
       feedback: isCorrect ? "Correct! Good job." : "That doesn't seem quite right. Try again!"
     };
   }
}
