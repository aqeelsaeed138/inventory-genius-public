// Currency and phone format detection based on country
export const CURRENCY_MAP: Record<string, { code: string; symbol: string; name: string }> = {
  PK: { code: "PKR", symbol: "Rs.", name: "Pakistani Rupee" },
  IN: { code: "INR", symbol: "₹", name: "Indian Rupee" },
  US: { code: "USD", symbol: "$", name: "US Dollar" },
  GB: { code: "GBP", symbol: "£", name: "British Pound" },
  EU: { code: "EUR", symbol: "€", name: "Euro" },
  AE: { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  SA: { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  BD: { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  CN: { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  JP: { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  AU: { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  CA: { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
};

// Phone format patterns per country
export const PHONE_FORMATS: Record<string, { 
  pattern: RegExp; 
  placeholder: string; 
  example: string;
  minLength: number;
  maxLength: number;
}> = {
  PK: { 
    pattern: /^(\+92|0)?[3][0-9]{9}$/, 
    placeholder: "+92 3XX XXXXXXX",
    example: "+92 300 1234567",
    minLength: 10,
    maxLength: 13
  },
  IN: { 
    pattern: /^(\+91|0)?[6-9][0-9]{9}$/, 
    placeholder: "+91 XXXXX XXXXX",
    example: "+91 98765 43210",
    minLength: 10,
    maxLength: 13
  },
  US: { 
    pattern: /^(\+1)?[2-9][0-9]{9}$/, 
    placeholder: "+1 (XXX) XXX-XXXX",
    example: "+1 (555) 123-4567",
    minLength: 10,
    maxLength: 12
  },
  GB: { 
    pattern: /^(\+44|0)?[7][0-9]{9}$/, 
    placeholder: "+44 7XXX XXXXXX",
    example: "+44 7123 456789",
    minLength: 10,
    maxLength: 13
  },
  AE: { 
    pattern: /^(\+971|0)?[5][0-9]{8}$/, 
    placeholder: "+971 5X XXX XXXX",
    example: "+971 50 123 4567",
    minLength: 9,
    maxLength: 13
  },
  SA: { 
    pattern: /^(\+966|0)?[5][0-9]{8}$/, 
    placeholder: "+966 5X XXX XXXX",
    example: "+966 50 123 4567",
    minLength: 9,
    maxLength: 13
  },
  BD: { 
    pattern: /^(\+880|0)?[1][3-9][0-9]{8}$/, 
    placeholder: "+880 1XXX XXXXXX",
    example: "+880 1712 345678",
    minLength: 10,
    maxLength: 14
  },
  CN: { 
    pattern: /^(\+86)?[1][3-9][0-9]{9}$/, 
    placeholder: "+86 1XX XXXX XXXX",
    example: "+86 138 1234 5678",
    minLength: 11,
    maxLength: 14
  },
  JP: { 
    pattern: /^(\+81|0)?[7-9]0[0-9]{8}$/, 
    placeholder: "+81 X0 XXXX XXXX",
    example: "+81 90 1234 5678",
    minLength: 10,
    maxLength: 13
  },
  AU: { 
    pattern: /^(\+61|0)?[4][0-9]{8}$/, 
    placeholder: "+61 4XX XXX XXX",
    example: "+61 412 345 678",
    minLength: 9,
    maxLength: 12
  },
  CA: { 
    pattern: /^(\+1)?[2-9][0-9]{9}$/, 
    placeholder: "+1 (XXX) XXX-XXXX",
    example: "+1 (416) 123-4567",
    minLength: 10,
    maxLength: 12
  },
};

// Default phone format for unknown countries
export const DEFAULT_PHONE_FORMAT = {
  pattern: /^[\d\s\-+()]{7,20}$/,
  placeholder: "+XX XXX XXX XXXX",
  example: "+1 234 567 8900",
  minLength: 7,
  maxLength: 20
};

export const COUNTRY_LIST = [
  { code: "PK", name: "Pakistan" },
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "BD", name: "Bangladesh" },
  { code: "CN", name: "China" },
  { code: "JP", name: "Japan" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
];

export const BUSINESS_TYPES = [
  { value: "clothing", label: "Clothing & Fashion" },
  { value: "electronics", label: "Electronics" },
  { value: "grocery", label: "Grocery" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "hardware", label: "Hardware & Tools" },
  { value: "furniture", label: "Furniture" },
  { value: "beauty", label: "Beauty & Cosmetics" },
  { value: "sports", label: "Sports & Fitness" },
  { value: "stationery", label: "Stationery & Books" },
  { value: "general", label: "General Store" },
];

export const getCurrencyForCountry = (countryCode: string) => {
  return CURRENCY_MAP[countryCode] || CURRENCY_MAP.US;
};

export const getPhoneFormatForCountry = (countryCode: string) => {
  return PHONE_FORMATS[countryCode] || DEFAULT_PHONE_FORMAT;
};

export const formatCurrency = (amount: number, symbol: string = "Rs.") => {
  return `${symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Validate phone number for a specific country
export const validatePhoneForCountry = (phone: string, countryCode: string): { valid: boolean; message?: string } => {
  if (!phone || phone.trim() === "") {
    return { valid: true }; // Phone is optional
  }
  
  // Remove all spaces, dashes, and parentheses for validation
  const cleanPhone = phone.replace(/[\s\-()]/g, "");
  
  const format = PHONE_FORMATS[countryCode] || DEFAULT_PHONE_FORMAT;
  
  if (cleanPhone.length < format.minLength) {
    return { valid: false, message: `Phone number is too short. Example: ${format.example}` };
  }
  
  if (cleanPhone.length > format.maxLength) {
    return { valid: false, message: `Phone number is too long. Example: ${format.example}` };
  }
  
  if (!format.pattern.test(cleanPhone)) {
    return { valid: false, message: `Invalid phone format. Example: ${format.example}` };
  }
  
  return { valid: true };
};