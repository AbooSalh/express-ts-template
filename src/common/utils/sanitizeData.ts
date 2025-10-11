/**
 * Converts Mongoose documents to plain JavaScript objects
 * This removes internal Mongoose metadata like $__, $isNew, _doc, etc.
 * @param data - The data to sanitize
 * @param debug - Optional debug logging
 */
export function sanitizeMongooseData(data: any, debug: boolean = false): any {
  if (!data) return data;

  if (debug) {
    console.log(
      "Sanitizing data type:",
      typeof data,
      Array.isArray(data) ? "array" : ""
    );
  }

  // Preserve Date values as ISO strings
  if (data instanceof Date) {
    try {
      return data.toISOString();
    } catch {
      return data;
    }
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => {
      // Buffer type guard for each item
      if (item && typeof item === "object") {
        // Handle { buffer: { ... } } structure
        if (
          Object.keys(item).length === 1 &&
          Object.prototype.hasOwnProperty.call(item, "buffer") &&
          item.buffer &&
          typeof item.buffer === "object"
        ) {
          const bufObj = item.buffer;
          const bufArr = Object.values(bufObj);
          if (bufArr.every((v) => typeof v === "number")) {
            return Buffer.from(bufArr).toString("hex");
          }
        }
        // Direct Buffer
        if (
          item.type === "Buffer" &&
          Array.isArray(item.data)
        ) {
          return Buffer.from(item.data).toString("hex");
        }
      }
      return sanitizeMongooseData(item, debug);
    });
  }

  // Handle Mongoose documents
  if (data && typeof data === "object" && data.toObject) {
    try {
      if (debug) console.log("Converting Mongoose document to object");
      const plainObject = data.toObject();
      // Recursively sanitize the plain object to handle nested structures
      return sanitizePlainObject(plainObject, debug);
    } catch (error) {
      if (debug)
        console.log(
          "toObject failed, falling back to manual sanitization:",
          error
        );
      // If toObject fails, fall back to manual sanitization
      return sanitizePlainObject(data, debug);
    }
  }

  // Handle plain objects
  if (data && typeof data === "object" && !(data).toObject) {
    return sanitizePlainObject(data, debug);
  }

  // Return primitives as-is
  return data;
}

/**
 * Helper function to determine if a field should be skipped during sanitization
 */
function shouldSkipField(key: string, obj: any): boolean {
  // Skip duplicate 'id' field if '_id' exists (Mongoose virtual)
  if (key === "id" && obj._id) {
    return true;
  }
  
  // Skip '_id' and 'id' fields from nested objects/arrays (except root level)  
  if ((key === "_id" || key === "id") && isNestedObject(obj)) {
    return true;
  }
  
  return false;
}

/**
 * Helper function to check if an object is nested (not a root document)
 */
function isNestedObject(obj: any): boolean {
  // Root documents typically have timestamps or other metadata
  const hasRootMetadata = obj.createdAt || obj.updatedAt || obj.__v !== undefined;
  return !hasRootMetadata;
}

/**
 * Helper function to sanitize plain objects
 */
function sanitizePlainObject(obj: any, debug: boolean = false): any {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip internal Mongoose properties and unwanted IDs
    if (key.startsWith("$") || key === "_doc" || shouldSkipField(key, obj)) {
      if (debug) console.log("Skipping internal property:", key);
      continue;
    }

    // Handle ObjectId or Buffer specially - convert to string
    // Dynamically stringify all ObjectId/Buffer fields
    if (value && typeof value === "object") {
      // Buffer type guard
      const maybeBuffer = value as { type?: string; data?: number[] };
      if (maybeBuffer.type === "Buffer" && Array.isArray(maybeBuffer.data)) {
        sanitized[key] = Buffer.from(maybeBuffer.data).toString("hex");
        continue;
      }
      // ObjectId: has toString() and is 12/24 hex chars or BSON type
      if (
        typeof (value as { toString?: () => string }).toString === "function" &&
        ((value.constructor && value.constructor.name === "ObjectId") ||
          /^[a-fA-F0-9]{24}$/.test((value as any).toString()) ||
          /^[a-fA-F0-9]{12}$/.test((value as any).toString()))
      ) {
        try {
          sanitized[key] = (value as { toString: () => string }).toString();
          if (debug) console.log("Converted ObjectId/Buffer to string:", key);
        } catch {
          sanitized[key] = value as any;
          if (debug) console.log("Failed to convert ObjectId/Buffer:", key);
        }
        continue;
      }
    }

    // Preserve Date values as ISO strings
    if (value instanceof Date) {
      try {
        sanitized[key] = value.toISOString();
      } catch {
        sanitized[key] = value;
      }
      continue;
    }

    // Handle localized fields - ensure they have proper structure
    if (isLocalizedField(value)) {
      if (debug) console.log("Processing localized field:", key);
      sanitized[key] = sanitizeLocalizedField(value, debug);
      continue;
    }

    // Recursively sanitize nested values
    sanitized[key] = sanitizeMongooseData(value, debug);
  }

  return sanitized;
}

/**
 * Check if a value is a localized field
 */
function isLocalizedField(value: any): boolean {
  if (!value || typeof value !== "object") return false;

  // Check if it has the structure of a localized field
  // Localized fields typically have language keys and metadata
  const hasLanguageKeys = Object.keys(value).some((key) =>
    [
      "en",
      "ar",
      "fr",
      "values",
      "required",
      "defaultLanguage",
      "supportedLanguages",
    ].includes(key)
  );

  return hasLanguageKeys;
}

/**
 * Sanitize localized fields to ensure proper structure
 */
function sanitizeLocalizedField(field: any, debug: boolean = false): any {
  if (debug) console.log("Sanitizing localized field:", field);

  // If it's a simple localized field with language keys, return as-is
  if (field.values && typeof field.values === "object") {
    return {
      values: field.values,
      required: field.required || false,
      defaultLanguage: field.defaultLanguage || "en",
      supportedLanguages: field.supportedLanguages || ["en"],
    };
  }

  // If it's a legacy localized field with direct language keys
  if (field.en || field.ar || field.fr) {
    return field;
  }

  // Return as-is if we can't determine the structure
  return field;
}

/**
 * Test function to verify sanitization works correctly
 * This can be used for debugging or testing purposes
 */
export function testSanitization() {
  // Mock Mongoose document structure
  const mockMongooseDoc = {
    $__: { activePaths: { paths: { name: "init" } } },
    $isNew: false,
    _doc: {
      _id: { buffer: [1, 2, 3] },
      name: "Test Name",
      description: "Test Description",
    },
    toObject: function () {
      return {
        _id: this._doc._id,
        name: this._doc.name,
        description: this._doc.description,
      };
    },
  };

  // Mock array of documents
  const mockArray = [
    mockMongooseDoc,
    {
      ...mockMongooseDoc,
      _doc: { ...(mockMongooseDoc as any)._doc, name: "Test 2" },
    },
  ];

  console.log(
    "Original mock document:",
    JSON.stringify(mockMongooseDoc, null, 2)
  );
  console.log(
    "Sanitized document:",
    JSON.stringify(sanitizeMongooseData(mockMongooseDoc), null, 2)
  );
  console.log(
    "Sanitized array:",
    JSON.stringify(sanitizeMongooseData(mockArray), null, 2)
  );
}

// Uncomment the line below to run the test when this file is imported
// testSanitization();
