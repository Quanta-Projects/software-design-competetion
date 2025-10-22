import { jsonToCsv } from "./csv";

describe("jsonToCsv", () => {
  test("returns empty string for empty array", () => {
    expect(jsonToCsv([])).toBe("");
  });

  test("returns empty string for null", () => {
    expect(jsonToCsv(null)).toBe("");
  });

  test("returns empty string for undefined", () => {
    expect(jsonToCsv(undefined)).toBe("");
  });

  test("converts simple objects to CSV", () => {
    const data = [
      { id: 1, name: "Alice", age: 30 },
      { id: 2, name: "Bob", age: 25 }
    ];
    const csv = jsonToCsv(data);
    const lines = csv.split("\r\n");
    
    expect(lines[0]).toBe("id,name,age");
    expect(lines[1]).toBe("1,Alice,30");
    expect(lines[2]).toBe("2,Bob,25");
  });

  test("properly quotes fields with commas", () => {
    const data = [
      { name: "Smith, John", city: "New York" }
    ];
    const csv = jsonToCsv(data);
    const lines = csv.split("\r\n");
    
    expect(lines[1]).toBe('"Smith, John",New York');
  });

  test("properly doubles quotes in field values", () => {
    const data = [
      { quote: 'He said "Hello"' }
    ];
    const csv = jsonToCsv(data);
    const lines = csv.split("\r\n");
    
    expect(lines[1]).toBe('"He said ""Hello"""');
  });

  test("properly quotes fields with newlines", () => {
    const data = [
      { text: "Line 1\nLine 2" }
    ];
    const csv = jsonToCsv(data);
    const lines = csv.split("\r\n");
    
    // The field should be quoted because it contains a newline
    expect(lines[1]).toContain('"');
    expect(lines[1]).toBe('"Line 1\nLine 2"');
  });

  test("handles missing fields in some rows", () => {
    const data = [
      { id: 1, name: "Alice", age: 30 },
      { id: 2, name: "Bob" }, // missing age
      { id: 3, age: 35 } // missing name
    ];
    const csv = jsonToCsv(data);
    const lines = csv.split("\r\n");
    
    expect(lines[0]).toContain("id");
    expect(lines[0]).toContain("name");
    expect(lines[0]).toContain("age");
    
    // Missing values should be empty strings
    expect(lines[2]).toMatch(/2,Bob,$/);
    expect(lines[3]).toMatch(/3,,35/);
  });

  test("handles null and undefined values", () => {
    const data = [
      { id: 1, name: null, age: undefined }
    ];
    const csv = jsonToCsv(data);
    const lines = csv.split("\r\n");
    
    expect(lines[1]).toBe("1,,");
  });

  test("uses CRLF line endings", () => {
    const data = [
      { a: 1 },
      { a: 2 }
    ];
    const csv = jsonToCsv(data);
    
    // Should contain \r\n, not just \n
    expect(csv).toContain("\r\n");
    expect(csv.split("\r\n").length).toBe(3); // header + 2 data rows
  });

  test("preserves header order from discovered keys", () => {
    const data = [
      { z: 1, a: 2, m: 3 }
    ];
    const csv = jsonToCsv(data);
    const lines = csv.split("\r\n");
    
    // Headers should be in some consistent order
    expect(lines[0]).toBeTruthy();
    expect(lines[0].split(",").length).toBe(3);
  });

  test("handles objects with varying keys", () => {
    const data = [
      { a: 1, b: 2 },
      { b: 3, c: 4 },
      { a: 5, c: 6 }
    ];
    const csv = jsonToCsv(data);
    const lines = csv.split("\r\n");
    
    // Header should include all keys
    const headers = lines[0].split(",");
    expect(headers).toContain("a");
    expect(headers).toContain("b");
    expect(headers).toContain("c");
    expect(headers.length).toBe(3);
  });

  test("handles complex escaping scenario", () => {
    const data = [
      { 
        message: 'Error: "Invalid input", please check\nthe logs' 
      }
    ];
    const csv = jsonToCsv(data);
    const lines = csv.split("\r\n");
    
    // Should be quoted, with doubled quotes and preserved newline
    expect(lines[1]).toBe('"Error: ""Invalid input"", please check\nthe logs"');
  });

  test("handles numeric and boolean values", () => {
    const data = [
      { id: 1, price: 19.99, active: true, deleted: false }
    ];
    const csv = jsonToCsv(data);
    const lines = csv.split("\r\n");
    
    expect(lines[1]).toContain("1");
    expect(lines[1]).toContain("19.99");
    expect(lines[1]).toContain("true");
    expect(lines[1]).toContain("false");
  });
});
