// Minik yönlendirici — bağımlılıksız (history API). Rotalar: / , /kayit , /giris , /app

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface RouterCtx {
  path: string;
  search: string;
  nav: (to: string, opts?: { replace?: boolean }) => void;
}

const Ctx = createContext<RouterCtx>({ path: '/', search: '', nav: () => {} });

const readLocation = () => ({
  path: window.location.pathname,
  search: window.location.search,
});

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(readLocation);
  useEffect(() => {
    const onPop = () => setLocation(readLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const nav = (to: string, opts?: { replace?: boolean }) => {
    if (opts?.replace) window.history.replaceState(null, '', to);
    else window.history.pushState(null, '', to);
    setLocation(readLocation());
    window.scrollTo(0, 0);
  };
  return <Ctx.Provider value={{ ...location, nav }}>{children}</Ctx.Provider>;
}

export const useRouter = () => useContext(Ctx);
