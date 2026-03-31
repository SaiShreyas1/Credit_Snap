export let BASE_URL = 'http://localhost:5000';

export const checkServerBaseUrl = async () => {
  const SERVER_IP = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : 'http://172.27.16.252:5000';
  const LOCAL_IP = 'http://localhost:5000';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    await fetch(SERVER_IP, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    BASE_URL = SERVER_IP;
    console.log(`[Config] Connected to Server Host: ${BASE_URL}`);
  } catch {
    BASE_URL = LOCAL_IP;
    console.log(`[Config] Server Host unreachable. Yielding to Localhost: ${BASE_URL}`);
  }

  return BASE_URL;
};
