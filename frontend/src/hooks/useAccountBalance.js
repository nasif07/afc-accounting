import { useState, useEffect } from 'react';
import { coaAPI } from '../services/apiMethods';

/**
 * Hook to fetch and cache account balance
 */
export const useAccountBalance = (accountId) => {
  const [balance, setBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!accountId) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await coaAPI.getBalance(accountId);
        setBalance(response.data.data?.balance || 0);
      } catch (err) {
        setError(err.message);
        setBalance(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [accountId]);

  return { balance, isLoading, error };
};

export default useAccountBalance;
