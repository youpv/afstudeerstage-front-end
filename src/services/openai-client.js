import OpenAI from 'openai';

// IMPORTANT: Ensure your OpenAI API key is set as an environment variable
// (e.g., in a .env file) named VITE_OPENAI_API_KEY.
// DO NOT HARDCODE YOUR API KEY HERE.
// The linter might flag environment variables in client-side code, 
// but Vite replaces `import.meta.env.VITE_*` variables during the build process.
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

let openai;
if (apiKey) {
  openai = new OpenAI({
    apiKey: apiKey,
    // IMPORTANT: When using environment variables in client-side React,
    // they are embedded during the build process. Avoid calling the API
    // directly from the client-side in production for security reasons.
    // This setup assumes you might proxy requests through your backend
    // or are using it in a development/secure environment.
    dangerouslyAllowBrowser: true // Required for client-side usage
  });
} else {
  console.error("OpenAI API key not found. Please set VITE_OPENAI_API_KEY environment variable.");
  // Optionally, handle this case more gracefully (e.g., disable AI features)
}

/**
 * Suggests field mappings using OpenAI's API.
 *
 * @param {object} dataSample - A sample object representing the data structure (e.g., processedPreviewData).
 * @param {string} systemPrompt - The detailed instructions for the AI model.
 * @returns {Promise<object>} - A promise that resolves to the suggested mapping object from the AI.
 * @throws {Error} - Throws an error if the API call fails or the API key is missing.
 */
export const suggestMappings = async (dataSample, systemPrompt) => {
  if (!openai) {
    throw new Error("OpenAI client is not initialized. API key might be missing.");
  }

  if (!dataSample || typeof dataSample !== 'object') {
      throw new Error("Invalid data sample provided for AI mapping.");
  }

  const dataSampleString = JSON.stringify(dataSample, null, 2);
  // Increased limit for larger data samples (from 10000 to 50000)
  if (dataSampleString.length > 50000) {
      throw new Error("Data sample is too large for AI processing. Try with a smaller sample.");
  }

  

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Or your preferred model
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Here is a sample of the data:\n\n\`\`\`json\n${dataSampleString}\n\`\`\`\n\nPlease provide the suggested mappings based on the system prompt instructions. Remember to map EVERY field in the data.`,
        },
      ],
      response_format: { type: "json_object" }, // Ensure JSON output
      temperature: 0.2, // Lower temperature for more deterministic results
    });

    

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("OpenAI returned an empty response.");
    }

    // Parse the JSON response from the AI
    const suggestedMapping = JSON.parse(responseContent);
    
    return suggestedMapping;

  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw new Error(`Failed to get suggestions from AI: ${error.message}`);
  }
};

// Placeholder for the system prompt - we will define this in the component
// or pass it dynamically.
export const DEFAULT_MAPPING_SYSTEM_PROMPT = `
You are an expert data mapping assistant for Shopify integrations. Your task is to analyze a sample JSON data object provided by the user and suggest mappings to Shopify product fields. You must attempt to map EVERY FIELD in the source data.

**CRITICAL: You MUST use the EXACT key names from the source data for mappings. Field names are case-sensitive. Only use keys that appear exactly as they are in the source JSON.**

**Output Format:**
Provide your response as a single JSON object with the following structure:
{
  "titleKey": "source_key_for_title", // REQUIRED: The EXACT key in the source data for the product title.
  "optionalFieldKeys": { // Map Shopify field CONSTANTS to EXACT source data keys
    "FIELD_VENDOR": "source_key_for_vendor",
    "FIELD_DESCRIPTION_HTML": "source_key_for_description",
    "FIELD_PRICE": "source_key_for_price",
    // ... include ALL relevant optional fields that have a matching source field
  },
  "metafieldMappings": [ // Array of metafield mapping objects
    // Example 1: Single value metafield
    {
      "mappingType": "single",
      "sourceKey": "source_key_for_single_metafield", // MUST be an EXACT key from the source data
      "metafieldNamespace": "custom", // e.g., custom, details
      "metafieldKey": "suggested_metafield_key", // e.g., material, feature_color
      "metafieldType": "single_line_text_field" // Suggest an appropriate Shopify metafield type
    },
    // Example 2: Dynamic metafields from an array of objects
    {
      "mappingType": "dynamic_from_array",
      "sourceKey": "source_key_for_array_of_objects", // MUST be an EXACT key from the source data
      "metafieldNamespace": "custom", // e.g., specifications
      "arrayKeySource": "key_within_object_for_metafield_key", // MUST be an EXACT key from the array objects
      "arrayValueSource": "key_within_object_for_metafield_value", // MUST be an EXACT key from the array objects
      "metafieldType": "single_line_text_field" // Suggest a *default* type for the generated metafields
    }
    // Add more metafield mappings as needed
  ]
}

**Shopify Field Constants (for optionalFieldKeys):**
{/* We will inject the actual constants here */}

**Instructions & Considerations:**
1. **Map EVERYTHING:** Your goal is to suggest mappings for EVERY field in the source data. No field should be left unmapped.

2. **Title is Mandatory:** Always identify and map the most likely candidate for \`titleKey\`.

3. **EXACT KEY NAMES:** You MUST use the EXACT key names as they appear in the source data. Do not change capitalization, spelling, or format.

4. **Match Optional Fields:** Map source keys to the provided \`FIELD_*\` constants in \`optionalFieldKeys\`. Try to find matches for ALL standard fields using EXACT key names from the source data.

5. **Infer Metafields for Complex/Non-Standard Data:**
   * **Simple Values:** For any key-value pair that doesn't map to a standard field, create a \`single\` metafield mapping.
   
   * **Arrays of Objects:** For arrays containing objects (e.g., \`[{prop_code: "COLOR", prod_value: "Red"}, ...]\`), create a \`dynamic_from_array\` mapping:
     - Set \`sourceKey\` to the EXACT array field name (e.g., "properties")
     - Set \`arrayKeySource\` to the EXACT field to use as metafield key (e.g., "prop_code")
     - Set \`arrayValueSource\` to the EXACT field to use as value (e.g., "prod_value")
     - Choose an appropriate namespace (e.g., the array name or "specifications")
   
   * **Simple Arrays:** For arrays of simple values (e.g., \`["value1", "value2"]\`), create a \`single\` metafield mapping with:
     - \`metafieldType\` set to "json_string" to store the entire array 
     - OR suggest multiple individual mappings if more appropriate
   
   * **Nested Objects:** For nested objects, create metafields with keys that represent the path (e.g., "parent_object.nested_field")

6. **Suggest Metafield Types:** Based on the data values, suggest an appropriate \`metafieldType\`:
   * Text values: \`single_line_text_field\` or \`multi_line_text_field\`
   * Numbers: \`number_integer\` or \`number_decimal\`
   * Booleans: \`boolean\`
   * URLs: \`url\`
   * Dates: \`date\` or \`date_time\`
   * Complex structures: \`json_string\`
   * Lists: \`list.single_line_text_field\` or another list type if appropriate

7. **Data Structure Analysis:** Analyze the provided JSON structure carefully. Pay special attention to:
   * Arrays of simple values (strings, numbers)
   * Arrays of objects (with consistent structure)
   * Nested objects
   * Special fields like IDs, codes, identifiers, prices, weights

8. **Organize Metafields:** Group related metafields using appropriate namespaces:
   * For arrays of objects, use a namespace related to the array's purpose
   * For simple fields, group by category (specifications, identifiers, details)

9. **Be Comprehensive:** Your goal is to map EVERY field, even if confidence is moderate. It's better to suggest a mapping that might need adjustment than to omit fields.

10. **JSON Output:** Ensure your entire output is valid JSON.

Remember: The goal is to map ALL fields from the source data to either standard Shopify fields or metafields. Don't leave anything unmapped, and ALWAYS use the EXACT key names from the original data.
`; 