import { getHello } from "./hello.service";
import { helloController } from "./hello.controller";
import { Request, Response } from "express";

describe("Hello Module", () => {
  describe("hello.service", () => {
    it("getHello should return the correct greeting", () => {
      expect(getHello()).toBe("Hello, Express with NestJS-like structure!");
    });
  });

  describe("hello.controller", () => {
    it("helloController should send the correct greeting", () => {
      const mockRequest = {} as Request;
      const mockResponse = {
        send: jest.fn(),
      } as unknown as Response;

      helloController(mockRequest, mockResponse);

      expect(mockResponse.send).toHaveBeenCalledWith(
        "Hello, Express with NestJS-like structure!"
      );
    });
  });
});
