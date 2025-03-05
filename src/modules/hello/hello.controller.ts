import { Request, Response } from "express";
import { getHello } from "./hello.service";

export const helloController = (req: Request, res: Response) => {
  res.send(getHello());
};
