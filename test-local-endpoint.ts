import { handler as geminiHandler } from "./netlify/functions/gemini.js";

async function main() {
  const event = {
    httpMethod: "POST",
    body: JSON.stringify({ model: "gemini-3-flash-preview", contents: "hi" }),
  };
  const context = {};
  const response = await geminiHandler(event, context);
  console.log("RESPONSE:", response);
}
main();
