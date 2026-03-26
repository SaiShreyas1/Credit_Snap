export let BASE_URL = 'http://localhost:5000';

export const checkServerBaseUrl = async () => {
  const SERVER_IP = 'http://172.27.16.252:5000';
  const LOCAL_IP = 'http://localhost:5000';

  try {
    const controller = new AbortController();
    // 2-second timeout so the UI doesn't hang if the server is off
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    // Ping the server to see if it responds
    await fetch(SERVER_IP, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    // If fetch didn't throw, the server is reachable
    BASE_URL = SERVER_IP;
    console.log(`[Config] Connected to Network Server: ${BASE_URL}`);
  } catch (error) {
    // If it threw (timeout or connection refused), fallback to localhost
    BASE_URL = LOCAL_IP;
    console.log(`[Config] Network Server unreachable. Yielding to Localhost: ${BASE_URL}`);
  }
  
  return BASE_URL;
};
