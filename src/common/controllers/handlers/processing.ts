/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { BaseControllerConfig } from "./types";

function getUserRole(req: Request): string {
  return (req as any).user?.role || "public";
}

function hideFields(doc: any, role: string, config: BaseControllerConfig): any {
  const hiddenFields = config.hiddenFields?.[role] || [];
  hiddenFields.forEach((field) => {
    delete doc[field];
  });
  return doc;
}

function sanitizeDocument(doc: any): any {
  if (!doc) return doc;

  if (Array.isArray(doc)) {
    return doc.map(sanitizeDocument);
  }

  let plainDoc = doc;
  if (typeof doc.toObject === "function") {
    plainDoc = doc.toObject();
  }

  return convertMapsToObjects(plainDoc);
}

function convertMapsToObjects(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => convertMapsToObjects(item));
    }
    
    if (obj instanceof Map) {
      const plainObj: any = {};
      for (const [key, value] of obj.entries()) {
        plainObj[key] = convertMapsToObjects(value);
      }
      return plainObj;
    }
    
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === "_id" && value && typeof value.toString === "function") {
        result[key] = value.toString();
      } else {
        result[key] = convertMapsToObjects(value);
      }
    }
    return result;
}

export async function processDocument(
  document: any,
  req: Request,
  res: Response,
  config: BaseControllerConfig
): Promise<any> {
  let processed = sanitizeDocument(document);

  if (config.dataHooks?.beforeProcessDocument) {
    processed = await config.dataHooks.beforeProcessDocument(
      processed,
      req,
      res
    );
  }

  if (config.processors) {
    Object.entries(config.processors).forEach(
      ([fieldName, processor]) => {
        processed[fieldName] = processor(processed, req);
      }
    );
  }

  const role = getUserRole(req);
  processed = hideFields(processed, role, config);

  if (config.dataHooks?.afterProcessDocument) {
    processed = await config.dataHooks.afterProcessDocument(
      processed,
      req,
      res
    );
  }

  return processed;
}

export async function processResponse(
  data: any,
  req: Request,
  res: Response,
  config: BaseControllerConfig
): Promise<any> {
  let processed = data;

  if (config.dataHooks?.beforeResponse) {
    processed = await config.dataHooks.beforeResponse(
      processed,
      req,
      res
    );
  }

  if (config.transforms?.responseTransform) {
    processed = config.transforms.responseTransform(processed, req, res);
  }

  if (config.dataHooks?.afterResponse) {
    processed = await config.dataHooks.afterResponse(
      processed,
      req,
      res
    );
  }

  return processed;
}
