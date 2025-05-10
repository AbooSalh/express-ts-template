/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IRequestBody {
  filters?: string;
  sort?: string;
  fields?: string;
  keywords?: string;
  page?: string;
  limit?: string;
  populate?: string;
}
interface IPagination {
  currentPage: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}
export class ApiFeatures {
  mongooseQuery;
  queryParams: IRequestBody;
  pagination: IPagination;

  constructor(mongooseQuery: any, queryParams: IRequestBody) {
    this.mongooseQuery = mongooseQuery;
    this.queryParams = queryParams;
    this.pagination = {
      currentPage: 1,
      limit: 20,
      totalPages: 0,
      totalResults: 0,
    };
  }

  filter() {
    // Reserved keys that are not filters
    const reserved = [
      "sort",
      "fields",
      "keywords",
      "page",
      "limit",
      "populate",
      "filters",
    ];
    // Use all non-reserved keys as filters
    const queryFilters: Record<string, any> = {};
    for (const [key, value] of Object.entries(this.queryParams)) {
      if (!reserved.includes(key) && value !== undefined && value !== "") {
        // Support for advanced filtering (e.g., price[gte]=10)
        if (key.includes("[")) {
          const match = key.match(/(\w+)\[(\w+)\]/);
          if (match) {
            const field = match[1];
            const op = match[2];
            if (!queryFilters[field]) queryFilters[field] = {};
            queryFilters[field][`$${op}`] = value;
            continue;
          }
        }
        queryFilters[key] = value;
      }
    }
    this.mongooseQuery = this.mongooseQuery.find(queryFilters);
    return this;
  }

  sort() {
    const sortValue = this.queryParams.sort;
    if (sortValue) {
      const sortBy = sortValue.split(" ").join(" ");
      this.mongooseQuery = this.mongooseQuery.sort(sortBy);
    } else {
      this.mongooseQuery = this.mongooseQuery.sort("-createdAt");
    }
    return this;
  }

  limitFields() {
    const fieldsValue = this.queryParams.fields;
    if (fieldsValue) {
      const fields = fieldsValue.split(",").join(" ");
      this.mongooseQuery = this.mongooseQuery.select(fields);
    } else {
      this.mongooseQuery = this.mongooseQuery.select("-createdAt -__v");
    }
    return this;
  }

  search() {
    const keywordsValue = this.queryParams.keywords;
    if (keywordsValue) {
      const keywords = keywordsValue;
      this.mongooseQuery = this.mongooseQuery.find({
        $or: [
          { title: { $regex: keywords, $options: "i" } },
          { description: { $regex: keywords, $options: "i" } },
        ],
      });
    }
    return this;
  }

  paginate(documentsCount?: number) {
    const pageValue = this.queryParams.page;
    const limitValue = this.queryParams.limit;
    const page = parseInt(pageValue || "1") * 1 || 1;
    const limit = parseInt(limitValue || "20") || 20;
    const skip = (page - 1) * limit;
    this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);
    this.pagination.currentPage = page;
    this.pagination.limit = limit;
    this.pagination.totalResults = documentsCount || 0;
    this.pagination.totalPages = Math.ceil(
      this.pagination.totalResults / this.pagination.limit
    );
    return this;
  }

  populate() {
    const populateValue = this.queryParams.populate;
    if (populateValue) {
      this.mongooseQuery = this.mongooseQuery.populate(populateValue);
    }
    return this;
  }
}
