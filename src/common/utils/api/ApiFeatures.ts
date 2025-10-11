/* eslint-disable @typescript-eslint/no-explicit-any */

import { IRequestQuery, IPagination } from "./types";

// Re-export types for backward compatibility
export type { IRequestQuery, IPagination } from "./types";

/**
 * API Features class for MongoDB queries
 * Provides filtering, sorting, pagination, field selection, and search functionality
 */
export class ApiFeatures {
  mongooseQuery: any;
  queryParams: IRequestQuery;
  pagination: IPagination;
  private _isDestroyed: boolean = false;

  /**
   * Creates an ApiFeatures instance
   * @param mongooseQuery - Mongoose query object
   * @param queryParams - Request query parameters
   */
  constructor(mongooseQuery: any, queryParams: IRequestQuery) {
    this.mongooseQuery = mongooseQuery;
    this.queryParams = queryParams;
    this.pagination = {
      currentPage: 1,
      limit: 20,
      totalPages: 0,
      totalResults: 0,
    };
  }

  /**
   * Checks if the instance has been destroyed
   */
  private checkDestroyed(): void {
    if (this._isDestroyed) {
      throw new Error(
        "ApiFeatures instance has been destroyed and cannot be used"
      );
    }
  }

  /**
   * Cleans up resources to prevent memory leaks
   */
  destroy(): void {
    this.mongooseQuery = null;
    this.queryParams = {} as IRequestQuery;
    this.pagination = {
      currentPage: 0,
      limit: 0,
      totalPages: 0,
      totalResults: 0,
    };
    this._isDestroyed = true;
  }

  private static readonly RESERVED_PARAMS = [
    "sort",
    "fields",
    "hide",
    "keywords",
    "search",
    "q",
    "page",
    "limit",
    "populate",
    "lang",
    "language",
  ];

  /**
   * Builds filter conditions from query parameters
   */
  private buildFilterConditions(): any[] {
    const conditions: any[] = [];

    for (const [key, value] of Object.entries(this.queryParams)) {
      if (this.isValidFilterParam(key, value)) {
        const fieldKey = key;
        const parsedValue = this.parseValue(value as string);
        conditions.push({ [fieldKey]: parsedValue });
      }
    }

    return conditions;
  }

  /**
   * Checks if a parameter is valid for filtering
   */
  private isValidFilterParam(key: string, value: any): boolean {
    return (
      !ApiFeatures.RESERVED_PARAMS.includes(key) &&
      value !== undefined &&
      value !== ""
    );
  }

  /**
   * Applies filtering to the query
   */
  filter(): this {
    this.checkDestroyed();
    const conditions = this.buildFilterConditions();

    if (conditions.length > 0) {
      this.mongooseQuery = this.mongooseQuery.find({ $and: conditions });
    }
    return this;
  }

  /**
   * Parses string values to appropriate types
   * @private
   */
  private parseValue(value: any): any {
    if (typeof value === "string") {
      if (value === "true") return true;
      if (value === "false") return false;
      if (/^\d+$/.test(value)) return parseInt(value, 10);
      if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
      if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
        const date = new Date(value);
        return !isNaN(date.getTime()) ? date : value;
      }
      if (value.includes(",")) {
        return value.split(",").map((v) => this.parseValue(v.trim()));
      }
      return value;
    }
    // If value is not a string, return as is (for $in, $gt, etc.)
    return value;
  }

  /**
   * Builds sort object from sort parameter
   */
  private buildSortObject(): Record<string, 1 | -1> {
    if (!this.queryParams.sort) return {};

    const sortFields = this.queryParams.sort.split(/[,\s]+/).filter(Boolean);
    const sortObject: Record<string, 1 | -1> = {};

    sortFields.forEach((field) => {
      const isDescending = field.startsWith("-");
      const cleanField = isDescending ? field.slice(1) : field;

      // Use the field directly without localization mapping
      const sortKey = cleanField;

      // Use the sortKey as the object key and set the sort direction
      sortObject[sortKey] = isDescending ? -1 : 1;
    });

    return sortObject;
  }

  /**
   * Applies sorting to the query
   */
  sort(): this {
    this.checkDestroyed();
    const sortObj = this.buildSortObject();
    if (Object.keys(sortObj).length > 0) {
      this.mongooseQuery = this.mongooseQuery.sort(sortObj);
    }
    return this;
  }

  /**
   * Maps field names for selection
   */
  /**
   * Maps field names for selection, supporting nested fields (dot notation)
   */
  private mapFieldsForSelection(fields: string[]): string[] {
    return fields.map((field) => field.trim());
  }

  /**
   * Handles field selection
   */
  private handleFieldSelection(): void {
    if (!this.queryParams.fields) return;
    const requestedFields = this.queryParams.fields.split(",");
    const mappedFields = this.mapFieldsForSelection(requestedFields);
    this.mongooseQuery = this.mongooseQuery.select(mappedFields.join(" "));
  }

  /**
   * Handles field hiding
   */
  private handleFieldHiding(): void {
    if (!this.queryParams.hide) return;
    const hiddenFields = this.queryParams.hide
      .split(",")
      .map((f) => `-${f.trim()}`)
      .join(" ");
    this.mongooseQuery = this.mongooseQuery.select(hiddenFields);
  }

  /**
   * Applies field selection/hiding to the query
   */
  limitFields(): this {
    this.checkDestroyed();
    if (this.queryParams.fields) {
      this.handleFieldSelection();
    } else if (this.queryParams.hide) {
      this.handleFieldHiding();
    } else {
      this.mongooseQuery = this.mongooseQuery.select("-__v");
    }
    return this;
  }

  /**
   * Applies text search across fields
   */
  search(): this {
    this.checkDestroyed();
    const searchTerm =
      this.queryParams.keywords ||
      this.queryParams.search ||
      this.queryParams.q;

    if (searchTerm) {
      const searchConditions: any[] = [];
      const searchRegex = { $regex: searchTerm, $options: "i" };

      // Search in common fields
      const searchableFields = ["title", "description", "name"];

      searchableFields.forEach((field) => {
        searchConditions.push({ [field]: searchRegex });
      });

      if (searchConditions.length > 0) {
        this.mongooseQuery = this.mongooseQuery.find({ $or: searchConditions });
      }
    }
    return this;
  }

  /**
   * Applies pagination to the query
   */
  paginate(totalCount?: number): this {
    this.checkDestroyed();
    const page = Math.max(1, parseInt(this.queryParams.page || "1", 10) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(this.queryParams.limit || "20", 10) || 20) // Cap at 100 to prevent memory issues
    );
    const skip = (page - 1) * limit;

    this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);

    this.pagination.currentPage = page;
    this.pagination.limit = limit;
    this.pagination.totalResults = totalCount || 0;
    this.pagination.totalPages = Math.ceil(
      this.pagination.totalResults / limit
    );

    return this;
  }

  /**
   * Populates related documents
   * Supports field selection for populated documents
   */
  populate(): this {
    this.checkDestroyed();
    const populateValue = this.queryParams.populate;
    if (populateValue) {
      const fields = populateValue
        .split(",")
        .map((f) => f.trim())
        .slice(0, 5); // Limit to 5 populations to prevent memory issues
      fields.forEach((field) => {
        const select = this.queryParams[`${field}Select`];
        this.mongooseQuery = this.mongooseQuery.populate({
          path: field,
          select: select || undefined,
        });
      });
    }
    return this;
  }

  /**
   * Applies all API features in the correct order
   * This is a convenience method that chains all available features
   * @param totalCount - Optional total count for pagination (if not provided, will be calculated)
   * @returns Promise<this> - Returns the instance for chaining
   */
  async applyAll(totalCount?: number): Promise<this> {
    this.checkDestroyed();

    // Apply filtering first
    this.filter();

    // Apply search
    this.search();

    // Apply sorting
    this.sort();

    // Get total count if not provided
    if (totalCount === undefined) {
      const countQuery = this.mongooseQuery.clone();
      totalCount = await countQuery.countDocuments();
    }

    // Apply pagination
    this.paginate(totalCount);

    // Apply field selection/hiding
    this.limitFields();

    // Apply population
    this.populate();

    return this;
  }

  /**
   * Applies all API features synchronously (without async operations)
   * Use this when you don't need the total count or when you have it already
   * @param totalCount - Total count for pagination
   * @returns this - Returns the instance for chaining
   */
  applyAllSync(totalCount: number = 0): this {
    this.checkDestroyed();

    // Apply filtering first
    this.filter();

    // Apply search
    this.search();

    // Apply sorting
    this.sort();

    // Apply pagination
    this.paginate(totalCount);

    // Apply field selection/hiding
    this.limitFields();

    // Apply population
    this.populate();

    return this;
  }

  /**
   * Gets the final mongoose query after applying all features
   * @returns The mongoose query object
   */
  getQuery(): any {
    this.checkDestroyed();
    return this.mongooseQuery;
  }

  /**
   * Executes the query and returns the results
   * @returns Promise<any[]> - The query results
   */
  async execute(): Promise<any[]> {
    this.checkDestroyed();
    return await this.mongooseQuery;
  }

  /**
   * Gets pagination information
   * @returns IPagination - The pagination object
   */
  getPagination(): IPagination {
    this.checkDestroyed();
    return this.pagination;
  }
}
