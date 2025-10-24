# AI Sınav Değerlendirme Sistemi - Proje Dokümantasyonu

## Proje Özeti

Django + OpenAI GPT-5 kullanarak sınav kağıtlarını OCR ile okuyup, yapay zeka ile değerlendiren bir sistem. Cevap anahtarı ve öğrenci sınavlarını PDF olarak alıyor, gerçek zamanlı olarak değerlendirmeyi stream ediyor.

## Teknoloji Stack

- **Framework**: Django 5.2.7 (ASGI - async destekli)
- **AI Model**: OpenAI GPT-5 (reasoning capability ile)
- **Streaming**: Server-Sent Events (SSE)
- **PDF İşleme**: OpenAI Vision API
- **Python**: 3.13+

## Mimari Yapı

```
Frontend (EventSource)
    ↓ HTTP POST + SSE Stream
Django View (Async)
    ↓
Service Layer (3 servis)
    ↓
OpenAI GPT-5 API
```

## Sistem Akışı

### 1. İlk Yükleme (Upload + Evaluation)

```
1. Kullanıcı dosyaları yükler:
   - 1 adet cevap anahtarı PDF
   - N adet öğrenci sınavı PDF

2. Backend işleme başlar:
   Step 1: Cevap anahtarını oku → Yapılandırılmış JSON çıkar
   Step 2: Tüm öğrenci sınavlarını oku (paralel) → Her biri JSON
   Step 3: GPT-5 ile değerlendir → Kelime kelime stream et
   
3. Frontend gerçek zamanlı güncellenir:
   - "Cevap anahtarı okunuyor..."
   - "2 öğrenci sınavı okunuyor..."
   - "Değerlendirme başlıyor..."
   - Değerlendirme metni kelime kelime akıyor...
   - "Tamamlandı"
```

### 2. Chat Devam Ettirme

```
1. Değerlendirme bittiğinde response_id kaydedilir
2. Kullanıcı soru sorar: "3. sorunun notunu açıklar mısın?"
3. Backend response_id ile conversation'a devam eder
4. GPT-5 önceki bağlamı hatırlayarak cevap verir
5. Cevap yine kelime kelime stream edilir
```

## Kod Yapısı

### Service Layer (scanner/services/openai.py)

4 adet servis var, hepsi dataclass ile yapılandırılmış:

#### 1. ReadAnswerKeyService
```python
@dataclass
class ReadAnswerKeyService:
    client: OpenAI
    
    def read_answer_key(self, pdf_file) -> dict:
        # PDF'i base64'e çevir
        # GPT-5'e gönder: "Bu cevap anahtarını JSON formatında çıkar"
        # Return: {questions: [{question_number, question, answer}]}
```

**Ne yapar**: Cevap anahtarı PDF'inden sorular ve cevapları çıkarır
**Özellik**: Stream kullanmaz, direkt JSON döner

#### 2. ReadStudentAnswersService
```python
@dataclass
class ReadStudentAnswersService:
    client: OpenAI
    
    def read_student_answers(self, pdf_file) -> dict:
        # Öğrenci sınavını oku
        # Return: {student_name, questions: [{question_number, student_answer}]}
```

**Ne yapar**: Öğrenci sınavındaki cevapları çıkarır
**Özellik**: Cevap anahtarı ile aynı formatta döner (kolay karşılaştırma için)

#### 3. EvaluateStudentAnswersService
```python
@dataclass
class EvaluateStudentAnswersService:
    client: OpenAI
    
    def evaluate_student_answers(self, student_answers, answer_key):
        # GPT-5'e conversation formatında gönder
        response = client.responses.create(
            model="gpt-5",
            input=[
                {"role": "developer", "content": PROMPT},
                {"role": "assistant", "content": str(answer_key)},
                {"role": "assistant", "content": str(student_1)},
                {"role": "assistant", "content": str(student_2)},
            ],
            reasoning={"effort": "medium"},  # Düşünerek değerlendir
            stream=True,  # Kelime kelime gönder
            store=True    # Conversation'ı sakla
        )
        return response  # Generator döner
```

**Ne yapar**: Öğrenci cevaplarını değerlendirir
**Özellik**: 
- Stream mode (kelime kelime gelir)
- Reasoning mode (AI düşünerek değerlendirir)
- Store=True (conversation kaydedilir)

#### 4. ContinueChatService
```python
@dataclass
class ContuniueChatService:
    client: OpenAI
    
    def continue_chat(self, response_id, message):
        # Önceki conversation'a devam et
        response = client.responses.create(
            previous_response_id=response_id,  # Önceki konuşmayı bağla
            model="gpt-5",
            input=[{"role": "user", "content": message}],
            stream=True
        )
        return response
```

**Ne yapar**: Önceki değerlendirme üzerinden sohbete devam eder
**Nasıl çalışır**: `previous_response_id` sayesinde AI önceki tüm konuşmayı hatırlar

### 5. Conversation Persistence

**Nasıl çalışır?**
```
1. İlk request → GPT-5 conversation oluşturur
   Response ID: "resp_xxx123"
   
2. Frontend bu ID'yi saklar

3. Kullanıcı soru sorar → Backend ID'yi kullanır
   previous_response_id: "resp_xxx123"
   
4. GPT-5 tüm konuşma geçmişini hatırlar
   Yeni Response ID: "resp_yyy456"
   
5. Döngü devam eder...
```

## OpenAI Event Stream Akışı

GPT-5'ten gelen event sırası:
```
1. ResponseCreatedEvent
   → response.id = "resp_xxx"
   → Frontend'e gönder
   
2. ResponseInProgressEvent
   → İşlem başladı
   
3. ResponseOutputItemAddedEvent (reasoning)
   → AI düşünüyor (reasoning mode)
   
4. ResponseOutputItemAddedEvent (message)
   → Cevap başlıyor
   
5-N. ResponseTextDeltaEvent
   → delta: "Ayşe"
   → delta: " Yılmaz"
   → delta: ":"
   → delta: "\n\n"
   → Her biri ayrı event olarak gelir
   
N+1. ResponseCompletedEvent
   → BURADA BREAK YAPILMALI
```

## Çalıştırma

```bash
# Bağımlılıkları yükle
pip install django django-cors-headers openai python-dotenv

# .env dosyası oluştur
echo "OPENAI_API_KEY=your-key-here" > .env

# Migration
python manage.py migrate

# Sunucuyu başlat
python manage.py runserver
```

## Özet

Bu sistem 4 ana component'ten oluşuyor:

1. **Service Layer**: OpenAI ile konuşan 4 servis
2. **Async View**: SSE stream eden Django view
3. **Event System**: GPT-5 event'lerini parse edip frontend'e ileten yapı
4. **Conversation Management**: response_id ile sohbet devam ettirme

**Ana özellik**: Gerçek zamanlı streaming evaluation with AI reasoning
**Ana teknik**: Async Django + SSE + OpenAI GPT-5 + Parallel processing

