import financeHandler from './_financeHandler.mjs'

export default function handler(request, response) {
  // Vercel fonksiyonunda yalnız Upstash KV kullanılabilir. Eksik ya da yarım
  // kurulumda yerel JSON'a düşmek üretim verisini bölümlendirir; bu nedenle
  // istek açıkça 503 ile fail-closed kalır.
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    response.statusCode = 503
    response.setHeader('content-type', 'application/json; charset=utf-8')
    response.setHeader('cache-control', 'no-store')
    response.end(JSON.stringify({
      error: 'Upstash KV için KV_REST_API_URL ve KV_REST_API_TOKEN birlikte zorunludur; yerel depoya fallback yapılmadı.',
      code: 'upstash_not_configured',
    }))
    return
  }
  return financeHandler(request, response)
}
