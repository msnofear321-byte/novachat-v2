import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface UnreadState {
  totalUnread: number;
  setTotalUnread: (count: number) => void;
}

const UnreadContext = createContext<UnreadState>({
  totalUnread: 0,
  setTotalUnread: () => {},
});

export function UnreadProvider({ children }: { children: ReactNode }) {
  const [totalUnread, setTotalUnread] = useState(0);
  const update = useCallback((count: number) => setTotalUnread(count), []);
  return (
    <UnreadContext.Provider value={{ totalUnread, setTotalUnread: update }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}
