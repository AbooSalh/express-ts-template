import { ApiResponseBase, ApiStatus } from "@/common/types/api.types";

export default class ApiResponse implements ApiResponseBase {
  public readonly statusCode: number;
  public readonly statusMessage: string;
  public readonly status: ApiStatus;
  public readonly message: string;
  public readonly timestamp: string;

  constructor(statusCode: number, statusMessage: string, message: string) {
    this.statusCode = statusCode;
    this.statusMessage = statusMessage;
    this.message = message;
    this.timestamp = new Date().toISOString();
    this.status = this.determineStatus(statusCode);
  }

  private determineStatus(statusCode: number): ApiStatus {
    if (statusCode >= 200 && statusCode < 300) return "success";
    if (statusCode >= 400 && statusCode < 500) return "fail";
    return "error";
  }
}
