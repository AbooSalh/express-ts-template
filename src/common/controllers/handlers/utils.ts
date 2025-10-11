/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { BaseControllerConfig, MiddlewareHook } from "./types";
import ApiError from "@/common/utils/api/ApiError";

export function getProcessorDependencies(
  requestedFields: string,
  config: BaseControllerConfig
): string[] {
  const dependencies: string[] = [];
  const fields = requestedFields.split(",").map((f) => f.trim());

  if (fields.includes("activeOffer") && config.processors?.activeOffer) {
    dependencies.push("offers");
  }

  return dependencies;
}

export async function runMiddleware(
  middlewares: MiddlewareHook[] | undefined,
  req: Request,
  res: Response
): Promise<void> {
  if (!middlewares) return;

  for (const middleware of middlewares) {
    await new Promise((resolve, reject) => {
      middleware(req, res, (err: any) =>
        err
          ? reject(new ApiError(err.message, "BAD_REQUEST"))
          : resolve(undefined)
      );
    });
  }
}

export async function customSort(
  docs: any[],
  sortParam: string,
  req: Request,
  config: BaseControllerConfig
): Promise<any[]> {
  const isDescending = sortParam.startsWith("-");
  const cleanField = sortParam.replace("-", "");

  const customSort = config.customSorts?.[cleanField];
  if (customSort) {
    return customSort(docs, isDescending, req);
  }

  return docs;
}
