// Landing vitrini — bugün GERÇEKTEN kurulmuş ürün demoları (~/projects/sectrai-*).
// Her satır çalışan kod + DEMO.md'den özetlendi; pazarlama uydurması değil.

export interface ProductInfo {
  id: string;
  name: string;
  audience: 'is' | 'bireysel' | 'capraz';
  tagline: string;
  highlight: string;
}

export const PRODUCTS: ProductInfo[] = [
  {
    id: 'sectrai-film-production',
    name: 'Film Production',
    audience: 'is',
    tagline: 'Cast katmanları, DOOD, call sheet, bütçe — set operasyon komutası.',
    highlight: 'Call sheet + Day-Out-of-Days tek "ilk çekim" karar ekranında birleşir.',
  },
  {
    id: 'sectrai-health',
    name: 'Healthcare Ops',
    audience: 'is',
    tagline: 'Onay-kapılı sağlık operasyonu; maker/checker ayrımı.',
    highlight: 'Kaydı oluşturan onaylayamaz; klinik-içerik sınırı reddi görünür.',
  },
  {
    id: 'sectrai-trade-console',
    name: 'Trade Lab',
    audience: 'is',
    tagline: 'Kâğıt-üstü alım-satım laboratuvarı — gerçek para YOK.',
    highlight: '10 fail-fast koruma kapısı ve dürüst adaptör etiketleri.',
  },
  {
    id: 'sectrai-expert-copilot',
    name: 'Expert Copilot',
    audience: 'is',
    tagline: 'Kanıtsız öneri üretemeyen uzman yardımcısı.',
    highlight: '"Kanıtsız oluştur" denemesi sözleşme tarafından reddedilir.',
  },
  {
    id: 'sectrai-foundry-console',
    name: 'Foundry',
    audience: 'is',
    tagline: 'Kanıt → niş → girişim → blueprint; yönetişimli girişim fabrikası.',
    highlight: 'Her karar REF-kayıtlarına ve sahip-kapılarına bağlı.',
  },
  {
    id: 'sectrai-studio',
    name: 'Studio',
    audience: 'is',
    tagline: 'Yaratıcı prodüksiyon karar yüzeyi; klavye-öncelikli.',
    highlight: '4 görsel varyasyon SIMULATED rozetiyle, API anahtarsız üretilir.',
  },
  {
    id: 'sectrai-gaming',
    name: 'Gaming',
    audience: 'is',
    tagline: 'Yaşayan oyun dünyaları çalışma alanı.',
    highlight: 'Belirsiz komutta tahmin etmez — netleştirme ister (fail-closed).',
  },
  {
    id: 'sectrai-company-memory',
    name: 'Firma Hafızası',
    audience: 'capraz',
    tagline: 'AI cevap vermekle kalmaz; firmanı tanır ve öğrenir.',
    highlight: 'Her öneri, dayandığı gözlem kimliklerini gösterir.',
  },
  {
    id: 'sectrai-symbiosis',
    name: 'Personal',
    audience: 'bireysel',
    tagline: 'Kişisel yansıma — verin sende, dışa aktarma ve silme tek tık.',
    highlight: 'Yönlendiren değil yansıtan bir "Yansıma Çerçevesi".',
  },
  {
    id: 'sectrai-learn',
    name: 'Learn',
    audience: 'bireysel',
    tagline: 'Çocuk-güvenli eğitim yapım aracı; yaş bantları, aile brifingi.',
    highlight: '"Yayınla" komutu insan onayıyla bile icra edilemez — bloke.',
  },
  {
    id: 'sectrai-coach',
    name: 'Coach',
    audience: 'bireysel',
    tagline: 'Doğrulanmış kanıt paketleriyle performans koçluğu.',
    highlight: 'Paket doğrulayıcı her checksum\'ı kontrol etmeden güvenmez.',
  },
  {
    id: 'sectrai-velvet',
    name: 'Velvet',
    audience: 'bireysel',
    tagline: 'Yaratıcı yoldaş; hikâye → medya onay zinciri.',
    highlight: 'Onaysız çıkarımlar sohbet bağlamına asla girmez.',
  },
  {
    id: 'sectrai-archive',
    name: 'The Archive',
    audience: 'bireysel',
    tagline: 'Sinematik kanon tarayıcısı; kaynak-izi görünür.',
    highlight: 'Gerçek bir yaratıcı karar, karar-tablosu olarak şeffaf sunulur.',
  },
  {
    id: 'sectrai-individual',
    name: 'Individual',
    audience: 'bireysel',
    tagline: 'Cihaz eşleştirme ve imzalı komutlar — tarayıcıda gerçek kripto.',
    highlight: 'İmza sonrası kurcalanan gövde SIGNATURE_INVALID ile durur.',
  },
  {
    id: 'xontainer',
    name: 'Xontainer',
    audience: 'is',
    tagline: 'Konteyner taşımacılığı yönetim platformu — yükleyici, taşıyıcı, şoför tek omurgada.',
    highlight: 'GPS + ELDS hash-zincirli kayıt: sefer verisi sonradan değiştirilemez, kanıtlanabilir.',
  },
  {
    id: 'yapiborsasi',
    name: 'Yapıborsası',
    audience: 'is',
    tagline: 'Türkiye inşaat sektörü için Full Construction OS — iş borsası, ekipman, hakediş, şantiye.',
    highlight: 'Hakedişte aşırı-tahakkuk otomatik reddedilir — taşeron sözleşme tutarını aşamaz.',
  },
];
