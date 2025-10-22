import { jsonToCsv } from "../utils/csv";
import { getRestApiUrl } from "../utils/config";

/**
 * Fetch annotations as CSV
 * If server returns CSV directly, use it.
 * If server returns JSON, convert to CSV on client.
 * 
 * @returns {Promise<Blob>} A Blob containing CSV data
 * @throws {Error} If request fails
 */
export async function fetchAnnotationsCsv() {
  const url = getRestApiUrl("annotations/all");
  
  const res = await fetch(url, {
    method: "GET",
    credentials: "include" // Include cookies for authentication
  });
  
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Authentication required. Please log in.");
    }
    if (res.status === 404) {
      throw new Error("Endpoint /api/annotations/all not found. The backend may not be implemented yet.");
    }
    
    // Try to get error message from response
    let errorMsg = `Request failed with status ${res.status}`;
    try {
      const text = await res.text();
      if (text && text.length < 200) {
        errorMsg += `: ${text}`;
      }
    } catch (e) {
      // Ignore if we can't read the error
    }
    throw new Error(errorMsg);
  }
  
  const ct = res.headers.get("content-type") || "";
  
  // If server returns CSV directly, use it
  if (ct.includes("text/csv")) {
    return await res.blob();
  }
  
  // If server returns HTML, it's likely an error page
  if (ct.includes("text/html")) {
    throw new Error("Backend returned HTML instead of data. The /api/annotations/all endpoint may not be implemented.");
  }
  
  // Try to parse as JSON
  let data;
  try {
    const text = await res.text();
    if (!text || text.trim().length === 0) {
      throw new Error("Backend returned empty response");
    }
    data = JSON.parse(text);
  } catch (parseError) {
    throw new Error(`Backend returned invalid JSON: ${parseError.message}`);
  }
  
  // Handle both array responses and wrapped responses
  const annotations = Array.isArray(data) ? data : (data.annotations || data.data || []);
  
  if (!Array.isArray(annotations)) {
    throw new Error("Backend response does not contain a valid array of annotations");
  }
  
  const csv = jsonToCsv(annotations);
  return new Blob([csv], { type: "text/csv;charset=utf-8" });
}
