// Minik yönlendirici — bağımlılıksız (history API). Rotalar: / , /kayit , /giris , /app

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface RouterCtx {
  path: string;
  nav: (to: string) => void;
}

const Ctx = createContext<RouterCtx>({ path: '/', nav: () => {} });

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const nav = (to: string) => {
    window.history.pushState(null, '', to);
    setPath(to);
    window.scrollTo(0, 0);
  };
  return <Ctx.Provider value={{ path, nav }}>{children}</Ctx.Provider>;
}

export const useRouter = () => useContext(Ctx);
