import { useUIStore } from '../store/uiStore';

export async function runWithGlobalLoading<T>(
  message: string,
  operation: () => Promise<T>,
): Promise<T> {
  const loadingId = useUIStore.getState().beginGlobalLoading(message);
  try {
    return await operation();
  } finally {
    useUIStore.getState().endGlobalLoading(loadingId);
  }
}
