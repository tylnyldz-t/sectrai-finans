// Puck'ın kullandığı tarayıcı API'si gerçek Chromium'da vardır; JSDOM bunu sağlamaz.
// Bu yalnız test ortamı için davranışsız gözlemci kabuğudur.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
