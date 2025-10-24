# Sınav Değerlendirme Sistemi - Frontend

### Temel Özellikler

- **Gerçek Zamanlı İletişim**: Backend'den gelen yanıtlar karakter karakter ekrana yazılır (typewriter efekti)
- **İnteraktif Chat Arayüzü**: Değerlendirme tamamlandıktan sonra AI ile soru-cevap yapılabilir
- **Çift Dosya Yükleme**: Cevap anahtarı (tek PDF) ve öğrenci sınavları (çoklu PDF) ayrı ayrı yüklenir
- **Modern Tasarım**: Responsive ve kullanıcı dostu arayüz
- **Tip Güvenli Kod**: Tam TypeScript desteği ile hatasız geliştirme

## Teknolojiler

- **Framework**: Next.js 15 (App Router)
- **Dil**: TypeScript
- **Stil**: Tailwind CSS
- **UI Bileşenleri**: shadcn/ui
- **İkonlar**: Lucide React
- **State Yönetimi**: React Hooks

## Proje Yapısı

```
pdf-scanner/
├── app/                      # Next.js sayfa ve layout dosyaları
├── components/               
│   ├── chat-interface.tsx    # Ana chat bileşeni
│   ├── chat-message.tsx      # Mesaj baloncukları
│   ├── chat-input.tsx        # Mesaj giriş alanı
│   ├── file-upload-form.tsx  # Dosya yükleme formu
│   ├── file-indicator.tsx    # Yüklenen dosya göstergeleri
│   └── ui/                   # Temel UI bileşenleri
├── hooks/                    # Custom React hooks
│   ├── use-sse.ts           # Server-Sent Events yönetimi
│   └── use-toast.ts         # Bildirim yönetimi
├── lib/                      
│   ├── api-client.ts        # Backend API istekleri
│   └── utils.ts             # Yardımcı fonksiyonlar
└── types/                    # TypeScript tip tanımlamaları
```

## Kurulum

### Gereksinimler

- Node.js 18 veya üzeri
- Backend API'nin `http://localhost:8000` adresinde çalışıyor olması

### Ortam Değişkenleri

Proje kök dizininde `.env.local` dosyası oluşturun:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Bağımlılıkları Yükleme

```bash
npm install
```

### Geliştirme Sunucusunu Başlatma

```bash
npm run dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

### Production Build

```bash
npm run build
npm start
```

## Kullanım Akışı

### 1. Başlangıç Ekranı
Kullanıcı iki dosya yükleme alanı görür:
- **Cevap Anahtarı**: Tek bir PDF dosyası
- **Öğrenci Sınavları**: Birden fazla PDF dosyası

Dosyalar sürükle-bırak veya tıklayarak seçilebilir.

### 2. Dosya Yükleme ve İşleme
"Değerlendirmeyi Başlat" butonuna tıklandığında:
- Dosyalar backend'e gönderilir
- Chat arayüzü açılır
- Yüklenen dosyalar üst kısımda gösterilir

### 3. Gerçek Zamanlı Durum Güncellemeleri
Backend işlem yaparken anlık bilgiler gelir:
- "Cevap anahtarı okunuyor..."
- "2 öğrenci sınavı okunuyor..."
- "Değerlendirme başlatılıyor..."

### 4. AI Değerlendirme
Değerlendirme metni karakter karakter ekrana yazılır:
- Tek bir mesaj baloncuğunda birikir
- Mor/indigo renkli görünür
- Yazma animasyonu ile görsel efekt sağlanır

### 5. Chat Etkileşimi
Değerlendirme tamamlandıktan sonra:
- Mesaj giriş alanı aktif hale gelir
- Kullanıcı sorular sorabilir
- Yanıtlar yine karakter karakter gelir
- Konuşma bağlamı korunur (response_id ile)

### 6. Sıfırlama
"Chat'i Sıfırla" butonu ile yeni dosyalarla baştan başlanabilir.

## Teknik Detaylar

### Gerçek Zamanlı İletişim (Server-Sent Events)

Proje, backend ile Server-Sent Events (SSE) protokolü üzerinden iletişim kurar. Bu sayede:
- Sunucudan gelen her güncelleme anında ekrana yansır
- Bağlantı kesilmesi durumunda otomatik yeniden bağlanma denenir
- Mesajlar buffer'lanarak düzgün şekilde parse edilir

### Mesaj Biriktirme Stratejisi

Streaming yanıtlar için özel bir mantık kullanılır:
- Her karakter için yeni mesaj oluşturulmaz
- Son mesajın üzerine ekleme yapılır
- Bu sayede hem performans artar hem de kullanıcı deneyimi iyileşir

### Response ID Yönetimi

Konuşma bağlamını korumak için:
- Backend'den gelen her `response_id` yakalanır ve saklanır
- Kullanıcı mesaj gönderirken bu ID ile birlikte gönderilir
- Her yeni yanıtta gelen `response_id` güncellenir
- Böylece AI önceki konuşmayı hatırlar

### Input Kontrolü

Mesaj giriş alanı akıllı bir şekilde yönetilir:
- İlk yükleme sırasında devre dışı
- Response stream devam ederken devre dışı
- Response ID alınana kadar devre dışı
- Sadece uygun zamanda kullanıcı yazabilir

## Bileşen Sorumlulukları

### `chat-interface.tsx`
- Ana orkestrasyon bileşeni
- Tüm state yönetimi burada yapılır
- SSE event'lerini handle eder
- Dosya yükleme ve mesaj gönderme işlemlerini yönetir

### `chat-message.tsx`
- Tek bir mesaj baloncuğunu render eder
- Farklı mesaj tiplerine göre stil uygular
- Yükleme animasyonlarını gösterir

### `chat-input.tsx`
- Mesaj giriş alanı ve gönder butonu
- Enter tuşu ile gönderim
- Disabled durumlarını yönetir

### `file-upload-form.tsx`
- İki ayrı dosya yükleme alanı
- Drag & drop desteği
- Dosya validasyonu (sadece PDF, maksimum boyut)

### `file-indicator.tsx`
- Yüklenen dosyaların özetini gösterir
- Dosya isimleri ve boyutları
- Chat başlığının altında yer alır

### `use-sse.ts` (Hook)
- SSE bağlantısını yönetir
- Event ve data satırlarını parse eder
- Bağlantı hatalarını yönetir
- Cleanup işlemlerini yapar


