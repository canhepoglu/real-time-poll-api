
# **Gerçek Zamanlı Anket Sistemi API**

Bu proje, kullanıcıların gerçek zamanlı olarak anket oluşturmasına, oy kullanmasına ve sonuçları görüntülemesine olanak tanıyan bir RESTful API'dir.

## **Özellikler**

- Kullanıcı Kayıt ve Giriş İşlemleri
- Farklı Rollerle (Admin, User, Moderator) Yetkilendirme
- Anket Oluşturma ve Yönetimi
- Oy Kullanma ve Anket Sonuçlarını Görüntüleme
- Anket Süresi Belirleme

## **Teknolojiler**

- **Node.js**: Sunucu tarafı geliştirme
- **Express.js**: RESTful API geliştirme
- **MongoDB**: Veritabanı
- **JWT**: Kimlik doğrulama ve yetkilendirme
- **Swagger**: API dokümantasyonu

## **Kurulum**

### **1. Gerekli Bağımlılıkları Kurun**

Proje klasöründe aşağıdaki komutu çalıştırarak bağımlılıkları yükleyin:

```bash
npm install
```

### **2. Çevresel Değişkenler**

Bir `.env` dosyası oluşturun ve aşağıdaki bilgileri ekleyin:

```
MONGO_URI=mongodb://localhost:27017/real-time-poll
JWT_SECRET=your_secret_key
PORT=4000
```

### **3. Sunucuyu Başlatın**

Aşağıdaki komutu çalıştırarak sunucuyu başlatın:

```bash
node server.js
```

## **API Endpointleri**

### **Auth (Kimlik Doğrulama)**

| Method | Endpoint          | Açıklama                   | Kimlik Doğrulama |
|--------|-------------------|---------------------------|------------------|
| POST   | `/api/auth/register` | Yeni kullanıcı kaydı       | Hayır            |
| POST   | `/api/auth/login`    | Kullanıcı girişi          | Hayır            |
| GET    | `/api/auth/profile`  | Kullanıcı profil bilgileri | Evet             |
| PUT    | `/api/auth/profile`  | Kullanıcı profili güncelle | Evet             |

### **Polls (Anketler)**

| Method | Endpoint              | Açıklama                                  | Kimlik Doğrulama |
|--------|-----------------------|------------------------------------------|------------------|
| POST   | `/api/polls`          | Yeni anket oluştur                       | Admin            |
| GET    | `/api/polls`          | Tüm anketleri listele                    | Hayır            |
| GET    | `/api/polls/:id`      | Belirli bir anketi getir                 | Hayır            |
| POST   | `/api/polls/vote/:id` | Belirli bir ankete oy kullan             | Evet (User)      |
| GET    | `/api/polls/:id/stats`| Belirli bir anketin istatistiklerini getir | Hayır          |

## **Swagger Dokümantasyonu**

API'nin detaylı dökümantasyonu için Swagger UI kullanılmaktadır. Swagger arayüzüne aşağıdaki adresten ulaşabilirsiniz:

```
http://localhost:4000/api-docs
```

## **Proje Yapısı**

```plaintext
├── routes/
│   ├── auth.js      # Kullanıcı kimlik doğrulama ve yetkilendirme
│   ├── poll.js      # Anket oluşturma, listeleme ve oy kullanma
├── models/
│   ├── User.js      # Kullanıcı modeli
│   ├── Poll.js      # Anket modeli
├── public/          # Statik dosyalar
├── server.js        # Sunucu yapılandırması
└── config/
    └── config.js    # Ortam değişkenleri
```

## **Test**

Henüz testler eklenmedi. İleride Jest ve Supertest kullanılarak unit ve entegrasyon testleri eklenecek.

## **Katkı**

Katkıda bulunmak isterseniz, lütfen bir pull request gönderin. Her türlü öneri ve geri bildirim değerlidir.

## **Lisans**

Bu proje MIT lisansı ile lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına bakabilirsiniz.
