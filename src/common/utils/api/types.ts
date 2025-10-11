/**
 * @fileoverview Type definitions and interfaces for API Features functionality
 * @description Contains all type definitions, interfaces, and JSDoc documentation for the ApiFeatures class
 */

/**
 * Interface for API request query parameters
 * @description Defines the structure of query parameters that can be passed to API endpoints
 */
export interface IRequestQuery {
  /** 
   * Sorting parameter (e.g., 'name,-createdAt')
   * @example 'name' - Sort by name ascending
   * @example '-createdAt' - Sort by createdAt descending
   * @example 'name,-createdAt' - Sort by name ascending, then createdAt descending
   */
  sort?: string;
  
  /** 
   * Fields to include in the response (e.g., 'name,email')
   * @example 'name,email' - Only return name and email fields
   * @example 'title,description,price' - Only return specified fields
   */
  fields?: string;
  
  /** 
   * Fields to hide from the response (e.g., 'password,secret')
   * @example 'password,secret' - Exclude password and secret fields
   * @example '__v,createdAt' - Hide version and creation timestamp
   */
  hide?: string;
  
  /** 
   * Search keywords for text search
   * @example 'cairo tour' - Search for documents containing these keywords
   */
  keywords?: string;
  
  /** 
   * Search term (alias for keywords)
   * @example 'pyramid' - Search for documents containing this term
   */
  search?: string;
  
  /** 
   * Query term (another alias for search)
   * @example 'adventure' - Search for documents containing this term
   */
  q?: string;
  
  /** 
   * Page number for pagination (1-based)
   * @example '1' - First page
   * @example '3' - Third page
   * @default '1'
   */
  page?: string;
  
  /** 
   * Number of items per page
   * @example '10' - Return 10 items per page
   * @example '50' - Return 50 items per page
   * @default '20'
   */
  limit?: string;
  
  /** 
   * Relations to populate (e.g., 'category,user')
   * @example 'category' - Populate the category field
   * @example 'user,category' - Populate both user and category fields
   */
  populate?: string;
  
  /** 
   * Language code for localization (e.g., 'en', 'ar')
   * @example 'en' - English
   * @example 'ar' - Arabic
   * @example 'it' - Italian
   * @deprecated This parameter is kept for backward compatibility but localization is handled differently
   */
  lang?: string;
  
  /** 
   * Alternative language parameter
   * @example 'english' - English language
   * @deprecated This parameter is kept for backward compatibility but localization is handled differently
   */
  language?: string;
  
  /** 
   * Dynamic filter parameters
   * @description Any additional query parameters will be treated as filter conditions
   * @example { category: 'adventure', price: '100' } - Filter by category and price
   * @example { isPublished: 'true', duration: '5' } - Filter by published status and duration
   */
  [key: string]: string | undefined;
}

/**
 * Interface for pagination metadata
 * @description Contains pagination information returned with API responses
 */
export interface IPagination {
  /** 
   * Current page number (1-based)
   * @example 1 - First page
   * @example 3 - Third page
   */
  currentPage: number;
  
  /** 
   * Number of items per page
   * @example 20 - 20 items per page
   * @example 50 - 50 items per page
   */
  limit: number;
  
  /** 
   * Total number of pages available
   * @example 5 - 5 pages total
   * @example 10 - 10 pages total
   */
  totalPages: number;
  
  /** 
   * Total number of results/documents
   * @example 100 - 100 total documents
   * @example 250 - 250 total documents
   */
  totalResults: number;
}

/**
 * Type for MongoDB sort object
 * @description Defines the structure for MongoDB sort operations
 */
export type SortObject = Record<string, 1 | -1>;

/**
 * Type for MongoDB filter conditions
 * @description Defines the structure for MongoDB filter operations
 */
export type FilterCondition = Record<string, any>;

/**
 * Type for parsed query values
 * @description Union type for values that can be parsed from query strings
 */
export type ParsedValue = string | number | boolean | Date | ParsedValue[];

/**
 * Interface for search configuration
 * @description Configuration options for text search functionality
 */
export interface ISearchConfig {
  /** Fields to search in */
  searchableFields: string[];
  /** Whether search is case sensitive */
  caseSensitive?: boolean;
  /** Search options for MongoDB regex */
  searchOptions?: string;
}

/**
 * Interface for populate configuration
 * @description Configuration for populating related documents
 */
export interface IPopulateConfig {
  /** Path to populate */
  path: string;
  /** Fields to select from populated document */
  select?: string;
  /** Nested population */
  populate?: IPopulateConfig[];
}
