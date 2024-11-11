  /**
   * Sanitizes a prompt string for use with Bedrock Agent
   *
   * The sanitization process does the following:
   * 1. Trim leading and trailing whitespace
   * 2. Normalize to lowercase
   * 3. Remove special characters &lt; &gt; ; &amp; |
   * 4. Escape HTML entities
   * 5. Validate input length and throw an error if it is too long
   * @param {string} prompt - The prompt string to sanitize
   * @returns {string} The sanitized prompt string
   * @throws {Error} If the sanitized prompt string is too long
   */
  export const sanitize = (prompt) => {
    const sanitizedPrompt = prompt
      .trim() // Trim leading and trailing whitespace
      .toLowerCase() // Normalize to lowercase
      .replace(/[<>;&|]/g, '') // Remove special characters
      .replace(/&/g, '&amp;') // Escape HTML entities
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  
    // Validate input length
    if (sanitizedPrompt.length > 2048) {
      throw new Error('Prompt is too long');
    }
  
    return sanitizedPrompt;
  };