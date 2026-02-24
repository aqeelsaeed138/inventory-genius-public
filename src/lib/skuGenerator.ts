/**
 * Generates a unique SKU based on product name and category
 * Format: [CATEGORY_PREFIX]-[PRODUCT_PREFIX]-[RANDOM_SUFFIX]
 * Example: ELEC-IPHN-7X3K
 */

/**
 * Extract meaningful prefix from a string (2-4 uppercase letters)
 */
const extractPrefix = (text: string, length: number = 4): string => {
  if (!text) return '';
  
  // Remove special characters and numbers, keep only letters
  const cleanText = text.replace(/[^a-zA-Z\s]/g, '').trim();
  
  if (!cleanText) return '';
  
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 1) {
    // Single word: take first N letters
    return words[0].substring(0, length).toUpperCase();
  }
  
  if (words.length === 2) {
    // Two words: take 2 letters from each
    return (words[0].substring(0, 2) + words[1].substring(0, 2)).toUpperCase();
  }
  
  // Multiple words: take first letter of each (up to length)
  return words
    .slice(0, length)
    .map(w => w[0])
    .join('')
    .toUpperCase();
};

/**
 * Generate a random alphanumeric suffix
 */
const generateRandomSuffix = (length: number = 4): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters (0, O, 1, I)
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate SKU from product name and optional category
 * @param productName - The name of the product
 * @param categoryName - Optional category name for prefix
 * @returns Generated SKU string
 */
export const generateSKU = (productName: string, categoryName?: string): string => {
  if (!productName.trim()) {
    return `SKU-${generateRandomSuffix(6)}`;
  }
  
  const productPrefix = extractPrefix(productName, 4);
  const randomSuffix = generateRandomSuffix(4);
  
  if (categoryName && categoryName.trim()) {
    const categoryPrefix = extractPrefix(categoryName, 3);
    return `${categoryPrefix}-${productPrefix}-${randomSuffix}`;
  }
  
  return `${productPrefix}-${randomSuffix}`;
};

/**
 * Validate if a string is a valid SKU format
 */
export const isValidSKU = (sku: string): boolean => {
  if (!sku) return false;
  // SKU should be alphanumeric with optional hyphens, 3-20 characters
  return /^[A-Za-z0-9-]{3,20}$/.test(sku);
};
