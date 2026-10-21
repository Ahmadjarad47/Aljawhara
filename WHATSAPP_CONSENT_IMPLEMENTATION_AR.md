# تسليم تكامل واتساب والأرقام الدولية — 21 أكتوبر 2026

طُبّق التنفيذ في الواجهة الحالية وفي مستودع الخلفية المحلي `D:\FreeLance\Ecom.taani\after`، المرتبط فعلياً بمستودع `Ahmadjarad47/Aljawhara.NET`. التعديلات محلية ولم تُنشر إلى الإنتاج.

## السلوك المنفذ

- الكويت افتراضية؛ اختيار جميع الدول المتاحة في بيانات libphonenumber، مع اسم عربي وعلم ورمز اتصال. الرقم المحلي الألماني يعمل عند اختيار ألمانيا. الإدخال الدولي `+` أو `00` يتجاوز الدولة الافتراضية.
- تحقق وتنسيق باستخدام `libphonenumber-js/max` و`libphonenumber-csharp`. الرقم الدولي الغامض دون بادئة لا يُفسّر تلقائياً كرقم أجنبي. تُقبل بادئة الدولة المختارة دون `+` عند صلاحيتها، ومنها `96550000000` للكويت.
- تخزين واتساب ومقارناته بتنسيق E.164 مع `+`. إزالة `+` محصورة في حد الإرسال إلى Gupshup. وجهة webhook تُعاد إلى E.164 قبل المطابقة.
- Checkout يعرض رقم التوصيل وجهةً لواتساب؛ مربع الموافقة اختياري وغير محدد افتراضياً. تفضيلات الحساب تُعرض للمعلومة، ويختار العميل موافقة هذا الطلب صراحة. تغيير المستلم يلغي الاختيار المحلي. لا تُحفظ الموافقة في localStorage.
- إعدادات الحساب تتضمن تحميل التفضيلات، مفتاح تشغيل، الدولة والرقم، حالة التحقق، إرسال الرمز، تأكيده، الحفظ وإلغاء الموافقة. الرقم المختلف يحتاج تحققاً جديداً. بدء التحقق من رقم مختلف يلغي الموافقة السابقة في الخادم، ولا يمنح تأكيد الرمز موافقة تلقائية.
- واجهات الحساب تستخدم Bearer عبر interceptor الحالي، مع منع التخزين المؤقت للتفضيلات ومنع إعادة طلب رمز التحقق تلقائياً بعد نتيجة شبكة غير مؤكدة.
- تفاصيل الطلب تتضمن موافقة جديدة لطلب الفاتورة القديمة. استجابة 202 تُعرض بوصفها إدراجاً في طابور الإرسال؛ لا تُعرض بوصفها تسليماً مؤكداً.
- لم تُغيّر قواعد تحقق Sadad أو حالات نجاح الدفع أو حاجز منع إعادة الإرسال بعد نتيجة مزود غير مؤكدة. تبقى قائمة Sandbox إلزامية للأرقام الكويتية والألمانية وغيرها.

## العقود

مسارات API الحالية محفوظة. اختيار الدولة يُستخدم في الواجهة لتحويل الرقم المحلي إلى E.164 قبل الطلب؛ لا يلزم حقل بلد جديد في DTO.

`POST /api/orders` عند الموافقة:

```json
{
  "shippingAddress": { "phone": "+4915112345678" },
  "whatsAppInvoiceOptIn": true,
  "whatsAppConsentPhone": "+4915112345678"
}
```

باقي حقول الطلب مطلوبة كالسابق. دون الموافقة تُرسل `whatsAppInvoiceOptIn: false` و`whatsAppConsentPhone: null`. يجب أن يطابق رقم الموافقة رقم التوصيل بعد التطبيع؛ لا يوجد مسار لتجاوز المطابقة برقم مختلف.

إعدادات الحساب تستخدم العقود الموجودة مباشرة، دون غلاف `data`:

| الطلب | البيانات |
|---|---|
| `GET /api/account/whatsapp/preferences` | النتيجة: `enabled`, `phoneNumber`, `phoneNumberConfirmed`, `consentAtUtc`, `revokedAtUtc` |
| `POST /api/account/whatsapp/phone-verification` | `{ "phoneNumber": "+4915112345678" }` |
| `POST /api/account/whatsapp/phone-verification/confirm` | `{ "phoneNumber": "+4915112345678", "code": "123456" }` |
| `PUT /api/account/whatsapp/preferences` | `{ "enabled": true, "phoneNumber": "+4915112345678" }`؛ الإلغاء: `{ "enabled": false, "phoneNumber": null }` |

رقم الحساب الرئيسي يُحدَّث عند تأكيد رقم واتساب، وفق عقد الخلفية الحالي؛ توضّح الواجهة ذلك قبل الإجراء. التحقق وحده لا يفعّل الإشعارات.

## الطلب 47

السبب المثبت في نسخة الكود السابقة: DTO الواجهة ومسار إنشاء الطلب لم يتضمنا حقلي الموافقة، ولم توجد واجهة لجمعها. لذلك يبقى `WhatsAppInvoiceOptIn` الخلفي بقيمة false وتبقى حقول الموافقة NULL، بما يتفق مع البيانات المرفقة للطلب 47. لم تُفحص سجلات الإنتاج أو قاعدة بيانات الطلب 47 مباشرة.

لم يُعدّل الطلب القديم ولم تُنشأ موافقة له ولم تُرسل رسائل حقيقية. بعد موافقة صاحبه الصريحة، تستخدم الواجهة:

```http
POST /api/orders/47/whatsapp-invoice/retry
Authorization: Bearer <owner-token>
Content-Type: application/json

{"consent":true,"whatsAppPhone":"+4915112345678"}
```

الرقم أعلاه مثال فقط؛ يجب استخدام رقم التوصيل الحقيقي للطلب. الضيف يستخدم `X-Guest-Order-Token` الأصلي بدلاً من توكن الحساب. الخادم يقبل المالك فقط، وفاتورة متوقفة لغياب الموافقة، دون أي دليل إرسال سابق. يمنع طلباً ثانياً ويُبقي إعادة تحقق الدفع وSandbox ضمن المعالج قبل الإرسال. لا يحتاج دفعاً جديداً.

## الترحيل والنشر

الترحيل الجديد: `20261021121752_InternationalWhatsAppPhones` في الخلفية.

- توسيع حقول واتساب المحدودة إلى 16 محرفاً لاستيعاب `+` و15 رقماً.
- إضافة `+` إلى أرقام الموافقات والتحقق والفواتير والأحداث القديمة المخزنة دولياً كأرقام فقط. لا تُضاف بادئة 965 جديدة ولا تُنشأ موافقات أو أوقات أو مصادر مفقودة.
- تبقى سجلات الهاتف القديمة العامة قابلة للقراءة عبر التطبيع؛ الطلبات والعناوين الجديدة أو المعدلة تُطبع في مسار الحفظ.
- يوجد اختبار فعلي لترقية البيانات والرجوع ثم الترقية مجدداً، مع إثبات بقاء الموافقة المفقودة NULL.
- يجب إيقاف عامل واتساب أثناء تحديث الخلفية والترحيل، ثم تشغيله بعد اكتمالهما حتى تستخدم المقارنات والأحداث التنسيق نفسه. ترحيل الإنتاج لم يُشغَّل ضمن هذه المهمة.
- `CountryCode=965` قيمة افتراضية فقط. `NationalNumberPattern` حقل قديم متروك للتوافق ولا يقيّد التحقق الدولي؛ أُزيل من مثال الإعدادات. قائمة Sandbox تقبل E.164 أو الصيغة الدولية الرقمية القديمة؛ لا تسمح بأي وجهة خارج القائمة.

من جذر الخلفية، بعد ضبط اتصال البيئة المستهدفة:

```powershell
dotnet ef database update --project Ecom.Infrastructure --startup-project Ecom.API
```

أُنتج SQL قابل لإعادة التشغيل في `after/artifacts/whatsapp-international-migration.sql` للمراجعة. يجب نشر تغييرات المستودعين معاً وتشغيل `npm ci` و`dotnet restore` لاعتماد المكتبتين الجديدتين.

## الملفات

في الواجهة، أُضيفت:

- `src/app/core/phone/phone-number.ts` و`phone-input.ts` و`phone-number.spec.ts`.
- `src/app/core/service/whatsapp.service.ts`.
- المكونات واختباراتها تحت `src/app/core/components/whatsapp-checkout/` و`whatsapp-preferences/` و`whatsapp-invoice-retry/`.

وعُدلت:

- `package.json`, `package-lock.json` لإضافة المكتبة.
- `src/app/admin/order/order.models.ts` و`src/app/core/service/checkout-payment.service.ts` لحقول الموافقة وطلب الفاتورة القديمة.
- `src/app/core/interceptors/auth.interceptor.ts` لخصوصية التفضيلات ومنع إعادة إرسال رمز التحقق تلقائياً.
- `src/app/core/stepper/stepper.ts`, `stepper.html`, `stepper.spec.ts`, `shipping-address.ts`, `shipping-step/shipping-step.ts`, `shipping-step/shipping-step.html`, `payment-timing-step/payment-timing-step.ts`.
- `src/app/user/dashboard/setting/setting.ts`, `setting.html`, `setting.spec.ts` وإضافة اختيار الدولة للهاتف وعناوين الحساب أيضاً.
- `src/app/user/dashboard/user-order/user-order.ts`, `user-order.html` لطلب الفاتورة القديمة.

قائمة الخلفية والتفاصيل موجودة أيضاً في `after/docs/WHATSAPP_INTERNATIONAL_CONSENT_AR.md`.

## نتائج التحقق

| التحقق | النتيجة |
|---|---|
| Angular production build | ناجح؛ تحذيرات CommonJS وحجم الحزم ورسائل prerender السابقة المتعلقة بـ localStorage ما زالت موجودة |
| اختبارات الواجهة المختارة | 43 ناجحة: تطبيع الأرقام، Checkout الفعلي، التفضيلات والتحقق والإلغاء، عرض الموافقة المحفوظة، الفاتورة القديمة، إعدادات العنوان وخدمة الدفع |
| .NET Release build | ناجح، صفر أخطاء و12 تحذيراً سابقاً |
| اختبارات الخلفية الكاملة | 217 ناجحة من 218؛ تشمل 52 اختبار واتساب ناجحاً جميعها |
| الفشل الخلفي المتبقي | `ProductionSeedingTests.Production_does_not_resolve_database_or_create_demo_data`؛ فشل سابق موثق في مستودع الخلفية لأن DataSeeder يحاول حل DbContext قبل حماية Production |
| توافق EF مع Migration | لا توجد تغييرات نموذج معلّقة؛ توليد SQL idempotent ناجح |
| فحص المتصفح | Checkout وإعدادات الحساب بعرض 390 و1366: لا تجاوز أفقي ولا أخطاء JavaScript؛ التفضيلات تستخدم Bearer فعلياً؛ جميع طلبات API في هذا الفحص Mock |

اختبارات الخلفية استخدمت PostgreSQL مؤقتاً مستقلاً على `127.0.0.1:55439` بأسماء قواعد فريدة، وإرسال Gupshup/Sadad وهمياً. لا رسائل WhatsApp حقيقية أو دفعات حقيقية.

السجلات المحلية: `tmp/whatsapp-build.log`, `tmp/whatsapp-frontend-tests.log`, `tmp/whatsapp-ui-results.json`، وفي الخلفية `artifacts/whatsapp-release-build.log`, `artifacts/whatsapp-full-tests.log` ونتائج TRX تحت `tests/Ecom.CheckoutAudit.Tests/TestResults/`.

المعاينات المحلية: `tmp/whatsapp-checkout-390.png`, `tmp/whatsapp-checkout-1366.png`, `tmp/whatsapp-settings-390.png`, `tmp/whatsapp-settings-1366.png`.
