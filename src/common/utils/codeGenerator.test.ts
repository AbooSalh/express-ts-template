import { generateCode } from "./codeGenerator";
import { randomInt } from "crypto";

jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"), // Import and retain default behavior
  randomInt: jest.fn(),
}));

describe("Code Generator", () => {
  beforeEach(() => {
    // Reset mocks before each test
    (randomInt as jest.Mock).mockClear();
  });

  describe("generateCode", () => {
    it("should generate a code of the default length (6) if no length is provided", () => {
      (randomInt as jest.Mock).mockReturnValue(0); // Always pick the first digit '0'
      const code = generateCode();
      expect(code).toHaveLength(6);
      expect(code).toBe("000000");
    });

    it("should generate a code of the specified length", () => {
      (randomInt as jest.Mock).mockReturnValue(1); // Always pick the second digit '1'
      const code = generateCode(4);
      expect(code).toHaveLength(4);
      expect(code).toBe("1111");
    });

    it("should generate a code containing only digits", () => {
      // Let randomInt return different values to get mixed digits
      let i = 0;
      (randomInt as jest.Mock).mockImplementation(() => (i++ % 10));
      const code = generateCode(10);
      expect(code).toMatch(/^[0-9]+$/);
      expect(code).toBe("0123456789");
    });

    it("should call randomInt with correct parameters", () => {
      generateCode(5);
      expect(randomInt).toHaveBeenCalledTimes(5);
      expect(randomInt).toHaveBeenCalledWith(0, 10); // digits "0123456789" has length 10
    });
  });
});
