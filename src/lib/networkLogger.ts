let installed = false;

export function installNetworkLogger() {
  if (installed || typeof global.fetch !== "function") {
    return;
  }

  const originalFetch = global.fetch.bind(global);

  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method?.toUpperCase() ?? "GET";
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    try {
      const response = await originalFetch(input, init);
      console.log("[APP FETCH]", method, url, response.status);
      return response;
    } catch (error) {
      console.log("[APP FETCH]", method, url, "NETWORK_ERROR");
      throw error;
    }
  };

  installed = true;
}
