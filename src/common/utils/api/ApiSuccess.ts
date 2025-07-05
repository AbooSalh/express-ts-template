import { Response } from "express";
import { HTTP_STATUS } from "@/common/constants/httpStatus"; // Import status constants
import ApiResponse from "@/common/utils/api/ApiResponse";

class ApiSuccess {
  public readonly statusCode: number;
  public readonly statusMessage: string;
  public readonly message: string;
  public readonly timestamp: string;
  public readonly status: string;
  public readonly result: object | null | string;

  constructor(
    status: keyof (typeof HTTP_STATUS)["SUCCESS"],
    message: string,
    result: object | null | string = null
  ) {
    const response = new ApiResponse(
      HTTP_STATUS.SUCCESS[status],
      "OK",
      message
    );
    this.statusCode = response.statusCode;
    this.statusMessage = response.statusMessage;
    this.message = response.message;
    this.timestamp = response.timestamp;
    this.status = response.status;
    this.result = result;
  }

  /** Sends response directly using Express `res` */
  private send(res: Response): void {
    res.status(this.statusCode).json(this);
  }

  /** Static method for convenience */
  static send(
    res: Response,
    status: keyof (typeof HTTP_STATUS)["SUCCESS"],
    message: string,
    data: object | null | string = null
  ) {
    new ApiSuccess(status, message, data).send(res);
  }
}

export default ApiSuccess;
