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
      model: "gpt-4.1-mini-2025-04-14", // Or your preferred model
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
      // temperature: 0.2, // Lower temperature for more deterministic results
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

**CRITICAL RULES:**
*   **Prioritize Standard Fields:** You MUST first attempt to map source data keys to the standard Shopify \`FIELD_*\` constants provided below. If a source key logically corresponds to a standard field (e.g., 'ean' to \`FIELD_BARCODE\`, 'brand' to \`FIELD_VENDOR\`), map it there in the \`optionalFieldKeys\` section.
*   **Metafields for Remainder:** Only after attempting to map to all standard fields should you map the *remaining* source keys to metafields in the \`metafieldMappings\` array.
*   **Exact Key Names:** You MUST use the EXACT key names from the source data for all mappings (both standard and metafields). Field names are case-sensitive. Only use keys that appear exactly as they are in the source JSON.
*   **Map Everything:** Ensure EVERY key from the source data is mapped to *either* a standard field or a metafield. No source keys should be left unmapped.

**Output Format:**
Provide your response as a single JSON object with the following structure:
{
  "titleKey": "source_key_for_title", // REQUIRED: The EXACT key in the source data for the product title.
  "optionalFieldKeys": { // Map Shopify field CONSTANTS to EXACT source data keys. PRIORITIZE THESE MAPPINGS.
    "FIELD_VENDOR": "source_key_for_vendor",
    "FIELD_DESCRIPTION_HTML": "source_key_for_description",
    "FIELD_PRICE": "source_key_for_price",
    "FIELD_BARCODE": "source_key_for_ean_or_barcode",
    // ... include ALL standard fields that have a clear, logical match in the source data.
  },
  "metafieldMappings": [ // Array of metafield mapping objects for fields NOT mapped above.
    // Example 1: Single value metafield (for source keys not matching standard fields)
    {
      "mappingType": "single",
      "sourceKey": "source_key_for_single_metafield", // MUST be an EXACT key from the source data NOT used in optionalFieldKeys
      "metafieldNamespace": "custom", // Use 'custom' or a logical group like 'specifications' (see instructions)
      "metafieldKey": "suggested_metafield_key", // e.g., material, feature_color
      "metafieldType": "single_line_text_field" // Suggest an appropriate Shopify metafield type
    },
    // Example 2: Dynamic metafields from an array of objects (if the array sourceKey doesn't map to a standard field)
    {
      "mappingType": "dynamic_from_array",
      "sourceKey": "source_key_for_array_of_objects", // MUST be an EXACT key from the source data NOT used in optionalFieldKeys
      "metafieldNamespace": "specifications", // Use a logical group name or 'custom'
      "arrayKeySource": "key_within_object_for_metafield_key", // MUST be an EXACT key from the array objects
      "arrayValueSource": "key_within_object_for_metafield_value", // MUST be an EXACT key from the array objects
      "metafieldType": "single_line_text_field" // Suggest a *default* type for the generated metafields
    }
    // Add more metafield mappings for all remaining unmapped source keys
  ]
}

**Shopify Field Constants (for optionalFieldKeys):**
{/* We will inject the actual constants here */}

**Instructions & Considerations:**
1.  **Standard Fields First:** Thoroughly check if each source key corresponds to one of the \`FIELD_*\` constants. Map these first in \`optionalFieldKeys\`. Be generous in matching (e.g., 'desc' or 'details' could map to \`FIELD_DESCRIPTION_HTML\`).
2.  **Metafields for Leftovers:** Any source key that does *not* logically map to a standard field MUST be included in the \`metafieldMappings\` array.
3.  **Title is Mandatory:** Always identify and map the most likely candidate for \`titleKey\`.
4.  **EXACT KEY NAMES:** You MUST use the EXACT key names as they appear in the source data. Do not change capitalization, spelling, or format.
5.  **Metafield Logic (for remaining keys):**
    *   **Simple Values:** For any simple key-value pair not mapped to a standard field, create a \`single\` metafield mapping.
    *   **Arrays of Objects:** For arrays of objects (e.g., \`[{prop_code: "COLOR", prod_value: "Red"}, ...]\`), if the main array key (e.g., "properties") wasn't mapped to a standard field, create a \`dynamic_from_array\` mapping.
    *   **Simple Arrays:** For arrays of simple values (e.g., \`["value1", "value2"]\`), if not mapped to a standard field (like Tags), create a \`single\` metafield mapping using a list type (e.g., \`list.single_line_text_field\`) or \`json_string\`.
    *   **Nested Objects:** For nested objects not mapped, create \`single\` metafields with keys representing the path (e.g., "parent_object.nested_field"), using \`json_string\` if the value is complex.

6.  **Metafield Namespaces:**
    *   **Group Logically:** Try to group related metafields under a logical namespace (e.g., 'specifications', 'details', 'shipping_info'). Use the source key name or a common theme if appropriate.
    *   **Use 'custom' for Singles:** If a namespace would only contain *one* metafield mapping, use the namespace \`custom\` instead of creating a single-use namespace.
    *   **Dynamic Arrays:** For \`dynamic_from_array\` types, the namespace should reflect the purpose of the array data (e.g., \`specifications\`, \`attributes\`).

7.  **Suggest Metafield Types:** Based on the data values, suggest the most appropriate \`metafieldType\` from the following list. Use list types (those starting with \`list.\`) for arrays of simple values when applicable:
    *   \`single_line_text_field\`
    *   \`multi_line_text_field\`
    *   \`json_string\`
    *   \`number_integer\`
    *   \`number_decimal\`
    *   \`boolean\`
    *   \`url\`
    *   \`date\`
    *   \`date_time\`
    *   \`color\`
    *   \`weight\`
    *   \`volume\`
    *   \`dimension\`
    *   \`rating\`
    *   \`list.single_line_text_field\`
    *   \`list.multi_line_text_field\`
    *   \`list.number_integer\`
    *   \`list.number_decimal\`
    *   \`list.boolean\`
    *   \`list.url\`
    *   \`list.date\`
    *   \`list.date_time\`
    *   \`list.json_string\`

8.  **Data Structure Analysis:** Analyze the provided JSON structure carefully, noting arrays, nested objects, and potential standard field matches.

9.  **Be Comprehensive:** Your goal is to map EVERY field. Prioritize standard fields, then map ALL remaining fields to metafields.

10. **JSON Output:** Ensure your entire output is valid JSON.

Remember: Priority is standard fields, then map ALL remaining source keys to metafields using EXACT source key names and logical namespaces ('custom' for single-use).
`; 