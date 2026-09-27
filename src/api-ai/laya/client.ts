import { Querys, AIResponse } from '../types';

// AI config to system-one modell laya here.
type ApiClientLayaOptions = {
  url?: string;
  apiKey?: string;
  timeout?: number;
};

export const apiClientLaya = ({
  url = 'http://localhost:8000',
  apiKey,
  timeout = 3000,
}: ApiClientLayaOptions) => {
  const endpoint = `${url.replace(/\/+$/, '')}/v1/systemone`;

  const predict = async (
    document: string,
    querys: Querys,
    signal?: AbortSignal,
  ): Promise<AIResponse> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ state: { document }, questions: querys }),
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(timeout)])
          : AbortSignal.timeout(timeout),
      });
    } catch (err) {
      throw new Error(`Laya request failed: ${(err as Error).message}`, { cause: err });
    }

    if (!res.ok) {
      throw new Error(`Laya returned HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    return (await res.json()) as AIResponse;
  };

  return { predict };
};
