let locked = false;

export const RecoveryCoordinator = {
  async run<T>(fn: () => Promise<T>): Promise<T | null> {
    if (locked) return null;
    locked = true;
    try {
      return await fn();
    } finally {
      locked = false;
    }
  },
};
