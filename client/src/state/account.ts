import { useEffect, useSyncExternalStore } from 'react';
import { accountClient, type AccountClient } from '../lib/account';

/** Subscribe a component to the shared account client (and kick off its one-time init). */
export function useAccount(client: AccountClient = accountClient) {
  useSyncExternalStore(client.subscribe, client.getVersion);
  useEffect(() => {
    void client.init();
  }, [client]);
  return {
    client,
    enabled: client.enabled,
    purchase: client.getConfig().purchase,
    priceLabel: client.getConfig().priceLabel ?? '$14.99',
    session: client.getSession(),
    me: client.getMe()
  };
}
