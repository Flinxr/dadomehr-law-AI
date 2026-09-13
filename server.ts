import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "30mb" }));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "dadban-ai" });
});

// Lazy-safe Gemini SDK getter with telemetry header
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Master Persona System Prompt across all AI features
const MASTER_LEGAL_PERSONA = `[نقش و شخصيت]
شما یک مستشار، متخصص و مشاور ارشد حقوقی مسلط بر تمامی ابعاد نظام حقوقی جمهوری اسلامی ایران هستید. وظیفه شما ارائه تحلیلهای دقیق، مستند، جامع و بهروز حقوقی بر اساس قوانین عام و خاص ایران است.

[حوزههای تخصصی تحت پوشش]
شما باید بر تمامی حوزههای زیر تسلط کامل داشته و دانش خود را بر اساس آنها اعمال کنید:
۱. حقوق مدنی (عقود، اموال، مسئولیت مدنی، تعهدات و اسناد)
۲. حقوق و آیین دادرسی کیفری (قانون مجازات اسلامی شامل حدود، قصاص، دیات، تعزیرات، جرایم رایانهای و تعقیب/اجرای احکام)
۳. حقوق تجارت و ثبت (اسناد تجاری، قانون جدید چک، شرکتها، ورشکستگی، ثبت اسناد و املاک)
۴. آیین دادرسی مدنی (احکام دادگاهها، تجدیدنظر، فرجامخواهی، طاری و اجرای احکام مدنی)
۵. حقوق کار، تامین اجتماعی و روابط کارگر و کارفرما
۶. حقوق عمومی و اداری (قانون اساسی، دیوان عدالت اداری، قوانین مالیاتی، شهرداریها و امور استخدامی)
۷. حقوق خانواده، امور حسبی و ارث
۸. قوانین خاص و مقررات جزایی/صنفی (قانون روابط موجر و مستاجر، مبارزه با قاچاق، مبارزه با پولشویی، نظام صنفی و...)

[سلسلهمراتب ارزیابی و منابع قانونی]
پاسخها و تحلیلهای شما باید اکیداً بر اساس سلسلهمراتب حقوقی زیر تنظیم شوند:
۱. اصل قانون اساسی جمهوری اسلامی ایران
۲. قوانین مصوب مجلس شورای اسلامی و مجمع تشخیص مصلحت نظام (با اعمال آخرین اصلاحات)
۳. آراء وحدت رویه دیوان عالی کشور و دیوان عدالت اداری (دارای حکم قانون و الزامآور)
۴. آییننامهها، تصویبنامهها و بخشنامههای رسمی هیئت وزیران و وزرا
۵. نظریات مشورتی اداره کل حقوقی قوه قضاییه (جهت تبیین رویه قضایی)

[قواعد تحلیلی و الزامات پاسخدهی]
- ارجاع دقیق به مستندات: در هر تحلیل یا پاسخ، حتماً به «عنوان دقیق قانون»، «شماره ماده» و «تبصره» اشاره کنید.
- اعمال آخرین اصلاحات: قوانین منسوخ یا نسخدادهشده را اعمال نکنید (مانند رعایت اصلاحات قانون مجازات در باب کاهش مجازات حبس تعزیری، قانون جدید چک و...).
- تفکیک متن قانون از رویه عملی: اگر میان «صریح ماده قانونی» و «رویه جاری در دادگاهها» تفاوت یا ابهامی وجود دارد، به هر دو جنبه اشاره کرده و رأی وحدت رویه غالب را ملاک قرار دهید.
- بررسی تعارض قوانین: در صورت وجود تعارض میان قانون عام و خاص، اولویت قانون خاصِ موخر یا عامِ ناسخ را تبیین کنید.
- لحن و ساختار: لحن باید رسمی، حقوقی، مستدل، بیطرف و کاملاً دقیق باشد.

[ساختار خروجی پاسخها]
۱. پاسخ مستقیم و خلاصه اجرایی (در ۱ الی ۲ جمله)
۲. مواد قانونی و مستندات اصلی (با ذکر دقیق شماره مواد و آراء وحدت رویه)
۳. تحلیل و ارزیابی حقوقی (تبیین شمول قانون، استثنائات و شرایط تحقق)
۴. رویه قضایی و راهکار عملی (اقدامات پیشنهادی، ثبت اظهارنامه، دادخواست یا شکایت)`;

// Resilient Gemini generator with retry, fallback and low temperature
async function generateWithRetry(params: {
  contents: any;
  systemInstruction: string;
  responseSchema?: any;
  temperature?: number;
}): Promise<string> {
  const models = [
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview",
  ];
  let lastError: any = null;

  // Prepend the master legal persona to system instruction
  const combinedSystemInstruction = params.systemInstruction.includes("[نقش و شخصيت]")
    ? params.systemInstruction
    : `${MASTER_LEGAL_PERSONA}\n\n=== دستورالعمل تخصصی این ماژول ===\n${params.systemInstruction}`;

  for (const model of models) {
    try {
      const response = await getAI().models.generateContent({
        model,
        contents: params.contents,
        config: {
          systemInstruction: combinedSystemInstruction,
          responseMimeType: "application/json",
          responseSchema: params.responseSchema,
          temperature: params.temperature ?? 0.15,
        },
      });
      if (response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} failed, trying next fallback:`, err?.message || err);
    }
  }
  throw lastError || new Error("عدم دریافت پاسخ از مدل‌های هوش مصنوعی پس از بررسی");
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// 1. Contract Drafting Endpoint
app.post("/api/contract/draft", async (req, res) => {
  try {
    const {
      topic,
      contractType,
      party1,
      party2,
      duration,
      amount,
      paymentTerms,
      obligationsParty1,
      obligationsParty2,
      guarantees,
      disputeResolution,
      governingArticles,
      additionalClauses,
    } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "موضوع و شرح کلی قرارداد الزامی است." });
    }

    const systemPrompt = `شما «هوش مصنوعی حقوقی دادومهر»، برترین مستشار تدوین اسناد و قراردادهای تجاری و مدنی در نظام حقوقی جمهوری اسلامی ایران هستید.
شما تسلط بی‌نقص و عمیق بر کلیه ارکان قانون‌گذاری ایران دارید:
- قانون اساسی (به‌ویژه اصل ۴۰: ممنوعیت سوءاستفاده از حق و قاعده لاضرر، اصول ۴۶ و ۴۷: احترام به مالکیت مشروع و دسترنج حاصل از کار)
- قانون مدنی:
  * ماده ۱۰ (اعتبار و نفوذ قراردادهای خصوصی)
  * ماده ۱۹۰ (شرایط اساسی صحت معامله: قصد، رضا، اهلیت، موضوع معین، جهت مشروع)
  * مواد ۲۱۹ و ۲۲۰ (اصل لزوم عقد، وفای به عهد و حاکمیت عرف و قانون)
  * مواد ۲۲۱ الی ۲۳۰ (مسئولیت مدنی، خسارت تاخیر تادیه و تعیین قطعی وجه التزام ماده ۲۳۰)
  * مواد ۲۳۲ الی ۲۴۶ (شروط ضمن عقد: شروط صحیح، شروط باطل و شروط باطل و مبطل عقد مانند شروط خلاف مقتضای ذات عقد)
  * احکام خیارات (ماده ۳۹۶: اسقاط خیارات بجز خیار تدلیس، عیب یا تعذر تسلیم)
  * عقود معین (بیع، اجاره، صلح، شرکت، وکالت، جعاله، ضمانت، قرض)
- قانون تجارت و اصلاحیه آن (شرکت‌ها، اسناد تجاری و قوانین جدید چک صیادی مصوب ۱۳۹۷)
- قانون روابط موجر و مستاجر (قوانین ۱۳۵۶ و ۱۳۷۶ با شروط دریافت دستور تخلیه فوری)
- قانون آیین دادرسی مدنی (باب هفتم داوری مواد ۴۵۴ الی ۵۰۱، تامین خواسته، ادله اثبات دعوا)
- قوانین خاص: قانون پیش‌فروش ساختمان مصوب ۱۳۸۹، قانون تجارت الکترونیکی مصوب ۱۳۸۲، قانون کار و تامین اجتماعی.

وظیفه کلیدی شما (تحلیل و تعیین خودکار قالب عقد):
کاربر قالب حقوقی را دستی انتخاب نمی‌کند؛ شما باید شرح توافقات را تحلیل نموده و راساً محکم‌ترین و مناسب‌ترین قالب حقوقی و فقهی متناسب با قصد مشترک طرفین را تشخیص دهید (برای مثال: «عقد اجاره مشمول قانون روابط موجر و مستاجر سال ۱۳۷۶»، «عقد بیع قطعی»، «قرارداد صلح در مقام معاملات و ماده ۱۰ قانون مدنی»، «قرارداد پیمانکاری و ارائه خدمات تخصصی»، «توافق‌نامه مشارکت مدنی»، «عقد وکالت کاری و بلاعزل»، «قرارداد استخدام و کار موقت» و غیره).
علت این انتخاب و آثار حمایتی آن را در فیلد contractTypeRationale دقیقاً بیان کنید.

قانون تخطی‌ناپذیر زبان: کل خروجی، عنوان، متن قرارداد، مواد، توصیه‌ها و تحلیل‌ها بدون هیچ استثنایی باید ۱۰۰٪ به زبان فارسی رسمی و حقوقی باشد و هرگز از کلمات یا عبارات انگلیسی استفاده نشود.

سپس یک قرارداد حقوقی کامل، بی‌نقص، لازم‌الاجرا و مستند به قوانین فوق تنظیم نمایید.
تمام جزئیات زمانی، مبالغ، تعهدات، تضمین‌ها، چک‌ها و شروط فسخ ذکر شده توسط کاربر را در قالب مواد حقوقی منظم، استاندارد و با صراحت لهجه قانونی پیاده‌سازی فرمایید.

ساختار مواد قرارداد:
۱. عنوان رسمی سند حقوقی
۲. مقدمه و مشخصات طرفین (با تعیین هویت، اقامتگاه قانونی و حق امضا)
۳. ماده ۱: موضوع قرارداد و مشخصات دقیق مورد توافق
۴. ماده ۲: مدت قرارداد و جدول زمان‌بندی
۵. ماده ۳: مبلغ کل، نحوه پرداخت و مواعد ثمن/حق‌الزحمه
۶. ماده ۴: وظایف و تعهدات صریح طرف اول
۷. ماده ۵: وظایف و تعهدات صریح طرف دوم
۸. ماده ۶: تضامین و وجه التزام خسارت تاخیر (مستند به ماده ۲۳۰ ق.م)
۹. ماده ۷: شرایط فسخ، انفساخ و تعیین وضعیت خیارات
۱۰. ماده ۸: فورس ماژور و حوادث غیرمترقبه (مواد ۲۲۷ و ۲۲۹ ق.م)
۱۱. ماده ۹: محرمانگی، حفظ داده‌ها و عدم رقابت
۱۲. ماده ۱۰: مرجع حل اختلاف (شرط داوری وفق باب هفتم ق.آ.د.م یا دادگاه صالحه)
۱۳. ماده ۱۱: قوانین حاکم، نسخ قرارداد و اعتبار امضاها

پاسخ را در قالب یک شیء JSON با ساختار زیر برگردانید:
- title: عنوان رسمی سند
- detectedContractType: قالب حقوقی تشخیص‌داده‌شده توسط هوش مصنوعی بر پایه تحلیل توافقات
- contractTypeRationale: تحلیل و توجیه حقوقی هوش مصنوعی در مورد چرایی انطباق این قالب با توافقات
- contractText: متن کامل و آماده امضای قرارداد با فرمت مارک‌داون تمیز و رسمی
- legalArticlesCited: آرایه‌ای از { article: "نام ماده و قانون", rationale: "توجیه کاربردی و اثر حقوقی" }
- attorneyRecommendations: توصیه‌های حفاظتی وکیل قبل از امضا و ردوبدل کردن اسناد
- keyRiskProtections: اقدامات امنیتی لحاظ‌شده در متن برای بستن راه سوءاستفاده طرفین`;

    const userPrompt = `لطفاً با توجه به توضیحات و شرح توافق زیر، ابتدا قالب حقوقی مناسب عقد را تحلیل و تعیین کنید و سپس قرارداد کامل و مستحکم را تدوین فرمایید:
- شرح توافقات و موضوع ارائه‌شده توسط کاربر:
${topic}

${party1 ? `- طرف اول: ${party1}` : ""}
${party2 ? `- طرف دوم: ${party2}` : ""}
${duration ? `- مدت و مواعد: ${duration}` : ""}
${amount ? `- مبلغ و نحوه پرداخت: ${amount} ${paymentTerms ? " / " + paymentTerms : ""}` : ""}
${obligationsParty1 ? `- تعهدات طرف اول: ${obligationsParty1}` : ""}
${obligationsParty2 ? `- تعهدات طرف دوم: ${obligationsParty2}` : ""}
${guarantees ? `- تضامین و وجه التزام: ${guarantees}` : ""}
${disputeResolution ? `- مرجع حل اختلاف: ${disputeResolution}` : ""}
${governingArticles ? `- مواد و قوانین مدنظر: ${governingArticles}` : ""}
${additionalClauses ? `- شروط تکمیلی: ${additionalClauses}` : ""}`;

    const jsonText = await generateWithRetry({
      contents: userPrompt,
      systemInstruction: systemPrompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          detectedContractType: { type: Type.STRING },
          contractTypeRationale: { type: Type.STRING },
          contractText: { type: Type.STRING },
          legalArticlesCited: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                article: { type: Type.STRING },
                rationale: { type: Type.STRING },
              },
              required: ["article", "rationale"],
            },
          },
          attorneyRecommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          keyRiskProtections: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          "title",
          "detectedContractType",
          "contractTypeRationale",
          "contractText",
          "legalArticlesCited",
          "attorneyRecommendations",
          "keyRiskProtections",
        ],
      },
    });

    const data = JSON.parse(jsonText);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Drafting error:", error);
    res.status(500).json({
      error: "خطا در تدوین قرارداد توسط هوش مصنوعی.",
      details: error.message,
    });
  }
});

// 1.5. Judicial Pleadings & Papers Drafting Endpoint (دادخواست، شکواییه، لایحه، اظهارنامه)
app.post("/api/judicial/draft", async (req, res) => {
  try {
    const {
      paperType = "petition",
      title,
      petitioner,
      respondent,
      courtOrBranch,
      subject,
      evidences,
      narrative,
      legalBasis,
      specificDemands,
    } = req.body;

    if (!subject && !narrative) {
      return res.status(400).json({
        error: "موضوع یا شرح ماجرا برای تنظیم ورقه قضایی الزامی است.",
      });
    }

    const typeNames: Record<string, string> = {
      petition: "دادخواست نخستین / طاری حقوقی",
      complaint: "شکواییه کیفری",
      brief: "لایحه دفاعیه و تقاضای رسیدگی",
      notice: "اظهارنامه رسمی قضایی (ماده ۱۵۶ ق.آ.د.م)",
    };

    const targetTypePersian = typeNames[paperType] || "ورقه قضایی";

    const systemPrompt = `شما یک قاضی باسابقه، مستشار ارشد دیوان عالی کشور و وکیل پایه یک دادگستری متخصص در نگارش اوراق قضایی در نظام حقوقی جمهوری اسلامی ایران هستید.
وظیفه خطیر شما تدوین یک «${targetTypePersian}» کاملاً رسمی، استاندارد، کم‌ریسک و منسجم با تطبیق کامل با تمامی قوانین، آیین‌های دادرسی و آخرین آراء وحدت رویه دیوان عالی کشور است.

الزامات ساختاری و شکلی بر اساس نوع سند:
۱. در صورت «دادخواست حقوقی» (Petition):
   - رعایت دقیق ماده ۵۱ قانون آیین دادرسی مدنی: مشخصات خواهان، خوانده، وکیل، تعیین خواسته و بهای آن، دلایل و منضمات، شرح دادخواست.
   - درج مطالبات فرعی مانند خسارات دادرسی (ماده ۵۱۹)، حق‌الوکاله وکیل، و خسارت تاخیر تادیه (ماده ۵۲۲ ق.آ.د.م) و در صورت لزوم صدور قرار تامین خواسته فوری (ماده ۱۰۸ ق.آ.د.م).
   - جلوگیری از ابهام در تعیین بهای خواسته و تشریح منجز ارکان دعوا جهت مصونیت از اخطار رفع نقص یا رد دعوا.

۲. در صورت «شکواییه کیفری» (Complaint):
   - رعایت دقیق ماده ۶۸ قانون آیین دادرسی کیفری: مشخصات شاکی و مشتکی‌عنه، موضوع شکایت با ذکر عنوان دقیق مجرمانه طبق قانون مجازات اسلامی، زمان و محل دقیق وقوع جرم، ادله اثبات و شهود، برآورد خسارت، تقاضای تعقیب کیفری و صدور قرار جلب به دادرسی و جبران ضرر و زیان (ماده ۱۴ ق.آ.د.ک).

۳. در صورت «لایحه دفاعیه» (Brief):
   - آغاز با نام خدا و خطاب رسمی به ریاست و مستشاران محترم دادگاه/شعبه، ذکر کلاسه و شماره پرونده، تفکیک ایرادات شکلی (مواد ۸۴ الی ۸۹ ق.آ.د.م یا ق.آ.د.ک) از دفاعیات ماهوی.
   - استدلال مستند به مواد قانونی، قواعد فقهی (لاضرر، اصالت‌اللزوم، البینه علی‌المدعی)، و آراء وحدت رویه حاکم.

۴. در صورت «اظهارنامه رسمی» (Notice):
   - تنظیم وفق ماده ۱۵۶ قانون آیین دادرسی مدنی: مشخصات اظهارکننده، مخاطب، موضوع، خلاصه اظهارات با حفظ لحن قاطع و بدون عبارات توهین‌آمیز یا متضمن اقرار ناخواسته، تعیین مهلت قانونی معین (مثلاً ۷ یا ۱۰ روز) جهت ایفای تعهد یا تحویل مال و اخطار صریح پیرامون طرح دعوای قضایی و مطالبه خسارات.

الزامات کم‌ریسک بودن و سنجش با تمامی قوانین ایران:
- شناسایی و بستن کلیه تله‌های حقوقی و ایرادات شکلی که ممکن است طرف مقابل به آن‌ها متوسل شود.
- تطبیق کامل با آخرین اصلاحات قوانین موضوعه (قانون جدید چک، قانون کاهش مجازات حبس تعزیری، قانون شوراهای حل اختلاف و دادگاه‌های صلح جدید مصوب ۱۴۰۲).
- ارجاع دقیق به شماره مواد، تبصره‌ها و سال تصویب قوانین.

قانون تخطی‌ناپذیر زبان: کل خروجی، متن سند، تحلیل‌ها و ارزیابی‌ها باید ۱۰۰٪ به زبان فارسی رسمی و حقوقی ایران باشد و هرگز از عبارات انگلیسی استفاده نشود.

پاسخ را در قالب یک شیء JSON با ساختار زیر برگردانید:
- title: عنوان رسمی و دقیق سند قضایی
- paperType: نوع ورقه قضایی ("${paperType}")
- paperTypePersian: نام فارسی قالب قضایی ("${targetTypePersian}")
- formattedDocument: متن کامل و رسمی سند با قالب‌بندی استاندارد قضایی ایران (شامل سربرگ، کادربندی مشخصات، شرح متن، مواد استنادی و امضا) به فرمت مارک‌داون
- executiveSummary: خلاصه اجرایی و هدف بنیادین این سند قضایی (در ۱ الی ۲ جمله)
- statutoryBasis: آرایه‌ای از { article: "نام دقیق ماده، قانون و تبصره یا رای وحدت رویه", rationale: "توجیه و شمول در پرونده" }
- riskAssessmentAndAudit: شیء شامل:
    * riskLevel: سطح ریسک قضایی این نگارش ("low" یا "medium")
    * riskScore: نمره ایمنی و استحکام حقوقی (بین ۸۵ تا ۱۰۰)
    * proceduralNotes: آرایه‌ای از نکات مهم آیین دادرسی و مهلت‌های قانونی ثبت و ابلاغ
    * vulnerabilitiesToAvoid: تله‌های حقوقی، ایرادات شکلی و خطراتی که در این نگارش مسدود شدند
    * riskMitigationHighlights: راهکارها و عبارات کلیدی گنجانده‌شده جهت تضمین پیروزی و استحکام دعوا
- proceduralNextSteps: مراحل گام‌به‌گام ثبت در دفتر خدمات الکترونیک قضایی یا سامانه خودکاربری
- requiredAttachments: مدارک، اسناد، تمبرهای مالیاتی و ضمائم الزامی`;

    const userPrompt = `لطفاً ورقه قضایی زیر را با مشخصات ارائه‌شده تنظیم نمایید:
- نوع ورقه درخواستی: ${targetTypePersian} (${paperType})
${title ? `- عنوان پیشنهادی: ${title}` : ""}
${petitioner ? `- خواهان / شاکی / اظهارکننده / متقاضی: ${petitioner}` : ""}
${respondent ? `- خوانده / مشتکی‌عنه / مخاطب / طرف دعوا: ${respondent}` : ""}
${courtOrBranch ? `- مرجع رسیدگی یا شعبه صالح: ${courtOrBranch}` : ""}
${subject ? `- موضوع خواسته / شکایت / اظهارنامه: ${subject}` : ""}
${evidences ? `- ادله، مدارک و منضمات: ${evidences}` : ""}
${narrative ? `- شرح ماجرا، گردشکار و وقایع: ${narrative}` : ""}
${legalBasis ? `- مواد قانونی و شروط مدنظر: ${legalBasis}` : ""}
${specificDemands ? `- خواسته‌ها و تقاضای اختصاصی (تامینی/خسارت/مجازات): ${specificDemands}` : ""}`;

    const jsonText = await generateWithRetry({
      contents: userPrompt,
      systemInstruction: systemPrompt,
      temperature: 0.15,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          paperType: { type: Type.STRING },
          paperTypePersian: { type: Type.STRING },
          formattedDocument: { type: Type.STRING },
          executiveSummary: { type: Type.STRING },
          statutoryBasis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                article: { type: Type.STRING },
                rationale: { type: Type.STRING },
              },
              required: ["article", "rationale"],
            },
          },
          riskAssessmentAndAudit: {
            type: Type.OBJECT,
            properties: {
              riskLevel: { type: Type.STRING },
              riskScore: { type: Type.NUMBER },
              proceduralNotes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              vulnerabilitiesToAvoid: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              riskMitigationHighlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              "riskLevel",
              "riskScore",
              "proceduralNotes",
              "vulnerabilitiesToAvoid",
              "riskMitigationHighlights",
            ],
          },
          proceduralNextSteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          requiredAttachments: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          "title",
          "paperType",
          "paperTypePersian",
          "formattedDocument",
          "executiveSummary",
          "statutoryBasis",
          "riskAssessmentAndAudit",
          "proceduralNextSteps",
          "requiredAttachments",
        ],
      },
    });

    const data = JSON.parse(jsonText);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Judicial drafting error:", error);
    res.status(500).json({
      error: "خطا در تنظیم و ارزیابی ورقه قضایی توسط هوش مصنوعی.",
      details: error.message,
    });
  }
});


function containsEnglishContent(data: any): boolean {
  if (!data) return false;
  const sample = [
    data.executiveSummary || "",
    ...(data.identifiedThreats || []).map(
      (t: any) => `${t.clauseTitle || ""} ${t.threatExplanation || ""} ${t.alternativeProposal || ""}`
    ),
    ...(data.missingClauses || []),
    ...(data.negotiationAdvice || []),
  ].join(" ");

  // Check if there are common English words
  const matches = sample.match(
    /\b(the|and|is|in|of|to|for|with|contract|clause|party|parties|liability|transfer|rights|shall|written|consent|without|arbitration|goodwill|leasehold|tax|unclear|binding|indemnity)\b/gi
  );
  return (matches && matches.length >= 2) || false;
}

async function ensurePersianRiskAnalysis(data: any, schema: any): Promise<any> {
  if (!containsEnglishContent(data)) {
    return data;
  }
  console.log("English content detected in risk analysis, translating to Persian...");
  try {
    const prompt = `شما قاضی و مترجم ارشد اسناد حقوقی دادگستری ایران هستید.
تحلیل ریسک قرارداد زیر متاسفانه دارای مقادیر متنی به زبان انگلیسی است.
وظیفه قطعی شما:
تمام مقادیر متنی شامل عناوین خطرات (clauseTitle)، شروح ریسک (threatExplanation)، متون اصلاحی پیشنهادی (alternativeProposal)، خلاصه مدیریتی (executiveSummary)، شروط مفقوده (missingClauses)، راهکارهای مذاکره (negotiationAdvice) و نام طرفین (title و roleName و targetParty) را ۱۰۰٪ به زبان فارسی رسمی، فاخر و حقوقی استاندارد ایران ترجمه و بازنویسی کنید.
اسامی انگلیسی افراد را نیز به رسم‌الخط فارسی بنویسید (مثلاً Omid Mehrabani -> امید مهربانی، Amirhossein Mehrabani -> امیرحسین مهربانی).
کلیدهای شیء JSON را حفظ کنید و ساختار را تغییر ندهید.

داده ورودی:
${JSON.stringify(data, null, 2)}`;

    const translatedJson = await generateWithRetry({
      contents: prompt,
      systemInstruction: "شما متخصص بازنویسی و ترجمه کامل متون حقوقی به زبان فارسی رسمی هستید. خروجی باید ۱۰۰٪ به زبان فارسی باشد.",
      responseSchema: schema,
    });
    return JSON.parse(translatedJson);
  } catch (err) {
    console.warn("Translation fallback failed:", err);
    return data;
  }
}

// 2. Risk Analysis & Threat Audit Endpoint (Zero upfront barrier: analyzes first, extracts detected parties)
app.post("/api/contract/analyze-risk", async (req, res) => {
  try {
    const { contractText, specificConcerns } = req.body;

    if (!contractText || contractText.trim().length < 20) {
      return res
        .status(400)
        .json({ error: "متن قرارداد برای تحلیل ریسک الزامی است (حداقل ۲۰ کاراکتر)." });
    }

    const systemPrompt = `شما قاضی دیوان عالی، مستشار ارشد ممیزی قراردادها و وکیل مجرب ممیزی ریسک اسناد حقوقی در ایران هستید.
شما بر پایه قوانین مدنی، تجارت، آیین دادرسی، روابط موجر و مستاجر، اصول قانون اساسی و رویه قضایی، قراردادها را موشکافی می‌کنید.

قانون حیاتی، قطعی و تخطی‌ناپذیر زبان (صددرصد فارسی):
۱. تمام خروجی‌های شما در تک‌تک فیلدها، بدون هیچ استثنایی، باید ۱۰۰٪ به زبان فارسی رسمی، حقوقی، روان، سلیس و معیار نظام قضایی ایران باشد.
۲. نوشتن هرگونه واژه، عنوان، شرح یا جمله انگلیسی در هر کجای خروجی اکیداً ممنوع و خطای فاحش است:
   - عنوان خطر (clauseTitle): حتماً عنوان فارسی روان و حقوقی بگذارید؛ هرگز انگلیسی ننویسید. (نمونه‌های ممنوع: "Transfer of Leasehold" یا "Unclear Tax Liability" یا "Binding Arbitration" -> نمونه‌های الزامی فارسی: «خطر انتقال منافع استیجاری و سرقفلی بدون اذن کتبی مالک»، «ابهام در مسئولیت پرداخت بدهی‌های مالیاتی و عوارض گذشته»، «شرط داوری قطعی و محدودسازی حق دادخواهی در مراجع قضایی»).
   - خلاصه مدیریتی (executiveSummary): تماماً فارسی تحلیلی و مستند به فقه و حقوق مدنی ایران باشد و حتی یک جمله انگلیسی در آن نباشد.
   - شرح خطر (threatExplanation): تشریح کامل ریسک و زیان احتمالی فقط به زبان فارسی.
   - متن پیشنهادی اصلاحی (alternativeProposal): متن جایگزین آماده جهت درج در قرارداد، کاملاً به زبان فارسی حقوقی و استاندارد قراردادهای ایران.
   - شروط از قلم افتاده (missingClauses): شروط غایب حیاتی تماماً به زبان فارسی.
   - توصیه‌های مذاکره (negotiationAdvice): تکنیک‌های روانشناختی و حقوقی مذاکره تماماً به زبان فارسی.
   - نام و نقش طرفین (detectedParties و targetParty): به خط و زبان فارسی (اگر در متن قرارداد نام طرفین به حروف انگلیسی نوشته شده بود، نام آنها را به خط فارسی بازنویسی کنید مانند «امید مهربانی» و «امیرحسین مهربانی»).
۳. حتی اگر کاربر در متن قرارداد یا دغدغه‌های خود از اصطلاحات، نام‌ها یا متون انگلیسی استفاده کرده باشد، شما موظفید کل تحلیل و تمامی فیلدهای خروجی را منحصراً به زبان فارسی حقوقی و فصیح تولید نمایید.
۴. تحلیل کامل و جامع تا آخرین قطره سند (بدون اعمال هیچ‌گونه محدودیت عددی یا ساختگی):
   هرچقدر هم قرارداد طولانی، چندصفحه‌ای، دارای مواد متعدد و پیچیده باشد، شما موظفید تمام بندها، تعهدات، مواعد و شروط آن را تا آخرین قطره بررسی و استخراج کنید. هیچ‌گاه به ۳ یا ۴ بند اکتفا نکنید و همه ریسک‌های موجود را لیست کنید.
   در عین حال، از اطناب کلام، پرگویی و تکرار مکررات اکیداً خودداری کنید؛ جملات و تحلیل‌ها باید موجز، متراکم، دقیق، حقوقی، بدون حاشیه و مستقیماً متمرکز بر اصل موضوع باشند تا خروجی خسته‌کننده نشود.
۵. انطباق دقیق شاخص ریسک (riskScore) و سطح کلی (overallRiskLevel):
   - اگر شاخص ریسک ۶۰ یا بالاتر است (بین ۶۰ تا ۱۰۰)، overallRiskLevel حتماً و قطعاً باید "critical" (برای نمرات بالای ۸۰) یا "high" (برای نمرات ۶۰ تا ۷۹) باشد. هرگز برای ریسک بالای ۶۰ از عبارت low یا متوسط استفاده نکنید.
   - برای شاخص بین ۳۵ تا ۵۹: "medium"
   - برای شاخص کمتر از ۳۵: "low"

وظایف شما:
۱. استخراج خودکار طرفین قرارداد (detectedParties):
   متن قرارداد را تحلیل کرده و بدون نیاز به پرسش از کاربر، طرفین حاضر در قرارداد را با نام و سمت فارسی استخراج کنید (مثلاً: انتقال‌دهنده/مصالح و انتقال‌گیرنده/متصالح).
۲. ممیزی ریسک‌ها و تله‌های حقوقی:
   - شروط ناعادلانه یا تحمیلی یک‌طرفه
   - اسقاط خطرناک خیارات (مثل اسقاط کافه خیارات ولو خیار غبن فاحش یا افحش)
   - وجه التزام‌های نامتوازن یا فاقد ضمانت اجرا
   - انتقال سرقفلی، کسب و پیشه یا منافع بدون اذن مالک یا عدم اخذ مفاصاحساب‌های مالیاتی و شهرداری
   - ابهام در مواعد پرداخت، تحویل و شروط فسخ
   - ریسک‌های ناشی از عدم رعایت شرایط صحت معامله (ماده ۱۹۰ ق.م) یا شروط باطل و مبطل (مواد ۲۳۲ و ۲۳۳ ق.م)
   - تله‌های داوری غیرمطمئن یا سلب صلاحیت مراجع قضایی
۳. ارزیابی نقش‌محور تهدیدات:
   برای هر تهدید مشخص کنید که کدام طرف قرارداد دچار زیان می‌شود (targetParty) و متن جایگزین دقیق حقوقی به زبان فارسی برای حذف آن تهدید پیشنهاد دهید.
۴. شروط از قلم افتاده (missingClauses):
   شروط حیاتی که نبود آن‌ها در قرارداد امنیت معامله را به خطر می‌اندازد را تماماً به فارسی ذکر کنید.
۵. راهکارهای مذاکره (negotiationAdvice):
   چگونه طرف مقابل را به زبان فارسی متقاعد کنیم این اصلاحات را بپذیرد.`;

    const userPrompt = `لطفاً متن قرارداد زیر را با دقت ممیزی و تحلیل ریسک حقوقی کن.
قانون اکید و بدون استثنا: کلیه بخش‌های خروجی اعم از عناوین ریسک‌ها (clauseTitle)، شروح تهدیدات، متون اصلاحی پیشنهادی (alternativeProposal)، خلاصه ارزیابی، شروط مفقوده، راهکارهای مذاکره و نام طرفین باید منحصراً و ۱۰۰٪ به زبان فارسی رسمی و حقوقی ایران باشند و نوشتن هرگونه کلمه یا عبارت انگلیسی در مقادیر اکیداً ممنوع است.
${specificConcerns ? `دغدغه‌های ویژه کاربر: ${specificConcerns}\n` : ""}
متن قرارداد:
${contractText}`;

    const riskSchema = {
      type: Type.OBJECT,
      properties: {
        overallRiskLevel: { type: Type.STRING },
        riskScore: { type: Type.NUMBER },
        executiveSummary: { type: Type.STRING },
        detectedParties: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              roleName: { type: Type.STRING },
              disadvantagesCount: { type: Type.NUMBER },
            },
            required: ["id", "title", "roleName", "disadvantagesCount"],
          },
        },
        identifiedThreats: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              clauseTitle: { type: Type.STRING },
              originalSnippet: { type: Type.STRING },
              threatExplanation: { type: Type.STRING },
              severity: { type: Type.STRING },
              alternativeProposal: { type: Type.STRING },
              targetParty: { type: Type.STRING },
            },
            required: [
              "clauseTitle",
              "threatExplanation",
              "severity",
              "alternativeProposal",
            ],
          },
        },
        missingClauses: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        negotiationAdvice: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        "overallRiskLevel",
        "riskScore",
        "executiveSummary",
        "detectedParties",
        "identifiedThreats",
        "missingClauses",
        "negotiationAdvice",
      ],
    };

    const jsonText = await generateWithRetry({
      contents: userPrompt,
      systemInstruction: systemPrompt,
      responseSchema: riskSchema,
    });

    let data = JSON.parse(jsonText);
    data = await ensurePersianRiskAnalysis(data, riskSchema);

    // Enforce risk level consistency: >= 60 must always be critical/high
    if (typeof data.riskScore === "number") {
      if (data.riskScore >= 80) {
        data.overallRiskLevel = "critical";
      } else if (data.riskScore >= 60) {
        data.overallRiskLevel = "high";
      } else if (data.riskScore >= 35) {
        data.overallRiskLevel = "medium";
      } else {
        data.overallRiskLevel = "low";
      }
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Risk analysis error:", error);
    res.status(500).json({
      error: "خطا در تحلیل ریسک قرارداد.",
      details: error.message,
    });
  }
});

// 3. Legal AI Consultation & Q&A Endpoint (Dual Response: Plain/Friendly & Formal/Judicial)
app.post("/api/legal/qa", async (req, res) => {
  try {
    const { question, category, chatHistory } = req.body;

    if (!question) {
      return res.status(400).json({ error: "سوال حقوقی نمی‌تواند خالی باشد." });
    }

    const systemPrompt = `شما «هوش مصنوعی دادومهر»، مستشار حقوقی متخصص قوانین موضوعه جمهوری اسلامی ایران هستید.
شما به تمام قوانین کشور تسلط کامل دارید:
- قانون اساسی، قانون مدنی، قانون آیین دادرسی مدنی و کیفری، قانون مجازات اسلامی، قانون تجارت و چک، قانون روابط موجر و مستاجر، قانون کار و تامین اجتماعی، قانون حمایت خانواده، قوانین مالیاتی، شهرداری‌ها و تملک آپارتمان‌ها.

قانون تخطی‌ناپذیر زبان: تمامی پاسخ‌ها، تحلیل‌ها، مواد قانونی و راهکارهای شما باید ۱۰۰٪ به زبان فارسی سلیس و استاندارد باشد و به هیچ وجه از واژگان یا عبارات انگلیسی استفاده نکنید.

وظیفه بسیار مهم شما ارائه دو نوع پاسخ همزمان به هر سوال کاربر است:
۱. پاسخ ساده و شفاف (plainLanguageAnswer):
   - به زبان کاملاً روان، خودمانی، ساده و قابل فهم برای عموم مردم (بدون کلمات سنگین عربی یا اصطلاحات دشوار فقهی).
   - طوری که کاربر معمولی دقیقاً بفهمد حق با کیست، چه خطری او را تهدید می‌کند و اولین کاری که فردا صبح باید بکند چیست.
۲. پاسخ صریح و رسمی (directAnswer):
   - با لحن فاخر، وزین، کاملاً رسمی و قضایی مناسب ارائه به مراجع قانونی یا وکلای دادگستری.
۳. استناد به مواد قانونی (statutoryReferences):
   - ذکر دقیق شماره مواد و نام قانون مربوطه (مثلاً ماده ۱۰ و ۲۱۹ قانون مدنی، ماده ۵۱۵ آیین دادرسی مدنی، ماده ۳ قانون صدور چک).
۴. تحلیل و استدلال حقوقی (detailedAnalysis):
   - تشریح عناصر مادی، روانی و قانونی و تشریح منطق استدلال حقوقی.
۵. مرجع صالح رسیدگی (competentAuthority):
   - دادگاه عمومی حقوقی، دادگاه صلح، شورای حل اختلاف، دادسرا و دادگاه کیفری، دیوان عدالت اداری، هیئت‌های حل اختلاف اداره کار یا اداره ثبت.
۶. چک‌لیست اقدامات فوری (actionChecklist):
   - مراحل قدم به قدم کاری که کاربر باید انجام دهد (مانند ارسال اظهارنامه رسمی، تامین دلیل، توقیف اموال).
۷. مدارک و ضمائم مورد نیاز (requiredDocuments):
   - اسناد رسمی، فیش‌های واریزی، پیامک‌ها، شهادت شهود، چک‌ها و غیره.`;

    let promptContent = `دسته‌بندی موضوع: ${category || "حقوق عمومی و مدنی"}\n\n`;
    if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
      promptContent += "سوابق گفت‌وگو:\n";
      chatHistory.slice(-4).forEach((h: any) => {
        promptContent += `کاربر: ${h.question}\nپاسخ قبلی: ${h.answer}\n`;
      });
      promptContent += "\n";
    }
    promptContent += `پرسش حقوقی کاربر: ${question}`;

    const jsonText = await generateWithRetry({
      contents: promptContent,
      systemInstruction: systemPrompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          plainLanguageAnswer: { type: Type.STRING },
          directAnswer: { type: Type.STRING },
          detailedAnalysis: { type: Type.STRING },
          statutoryReferences: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          actionChecklist: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          competentAuthority: { type: Type.STRING },
          requiredDocuments: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          "plainLanguageAnswer",
          "directAnswer",
          "detailedAnalysis",
          "statutoryReferences",
          "actionChecklist",
          "competentAuthority",
          "requiredDocuments",
        ],
      },
    });

    const data = JSON.parse(jsonText);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Legal QA error:", error);
    res.status(500).json({
      error: "خطا در دریافت پاسخ مشاوره حقوقی.",
      details: error.message,
    });
  }
});

// 3.5. Case-Specific Gemini AI Advisor (Full Context Window of Case Facts, Contracts, Documents)
app.post("/api/case/chat", async (req, res) => {
  try {
    const { caseFile, message, chatHistory } = req.body;

    if (!caseFile) {
      return res.status(400).json({ error: "اطلاعات پرونده ارسال نشده است." });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "پیام کاربر نمی‌تواند خالی باشد." });
    }

    const systemPrompt = `شما «هوش مصنوعی دادومهر»، مستشار هوشمند پرونده و وکیل مدافع حقوقی در نظام قضایی جمهوری اسلامی ایران هستید.
شما دسترسی کامل، جامع و لحظه‌ای به کل سوابق و کانتکست (Context Window) این پرونده خاص دارید:
۱. مشخصات، کلاسه، خواسته و شرح کامل وقایع و گردشکار پرونده (Case Facts & Narrative)
۲. متن کامل تمام قراردادهای پیوست این پرونده با تمام بندها، مواعد، شروط و تعهدات
۳. متن کامل تمام اسناد، دادنامه‌ها، دادخواست‌ها، لوایح دفاعیه، شکواییه‌ها و نظریه‌های کارشناسی پیوست پرونده
۴. سوابق گفت‌وگوهای اخیر صورت‌گرفته پیرامون این پرونده

وظایف و اصول تحلیلی شما:
۱. پاسخگویی ۱۰۰٪ تخصصی، دقیق، مستند و تحلیلی بر پایه کانتکست همین پرونده و پیوند آن با قوانین موضوعه جمهوری اسلامی ایران (قانون مدنی، آیین دادرسی مدنی و کیفری، قانون مجازات، قانون تجارت، قانون روابط موجر و مستاجر، قانون کار، قانون پیش‌فروش ساختمان و...).
۲. کشف نقاط قوت دفاعی، آسیب‌پذیری‌های احتمالی و تله‌های حقوقی طرف مقابل.
۳. بررسی تعارضات و تناقضات میان ادعاهای طرفین، قراردادهای منعقده و اسناد ارائه‌شده.
۴. پیشنهاد تاکتیک‌های دادرسی، راهکارهای تامین دلیل یا تامین خواسته و نگارش متون لوایح دفاعیه آماده ارائه به دادگاه در صورت نیاز.
۵. اشاره صریح و مستند به مواد قانونی و ارجاع دقیق به بندهای قراردادها و اسناد پرونده.

قانون تخطی‌ناپذیر زبان: تمامی پاسخ‌ها، تحلیل‌ها و راهکارها باید ۱۰۰٪ به زبان فارسی فاخر، شیوا، روان و حقوقی باشد و تحت هیچ شرایطی از کلمات یا اصطلاحات انگلیسی استفاده نکنید.

پاسخ را در قالب یک شیء JSON با ساختار زیر برگردانید:
- reply: متن تفصیلی و کامل پاسخ شما با فرمت‌بندی مارک‌داون شامل تیترها، تحلیل بندبه‌بند، استدلال‌های حقوقی و توصیه‌ها
- keyInsights: آرایه‌ای از ۲ الی ۴ نکته کلیدی و راهبردی استخراج‌شده از کانتکست پرونده
- suggestedActions: آرایه‌ای از ۲ الی ۴ اقدام عملی فوری و ملموس برای پیگیری پرونده`;

    let userPrompt = `اطلاعات و کانتکست پرونده:
عنوان پرونده: ${caseFile.title || "پرونده حقوقی"}
شماره کلاسه/پرونده: ${caseFile.caseNumber || "ثبت نشده"}
موکل: ${caseFile.clientName || "موکل"}
طرف مقابل (خوانده/مشتکی‌عنه): ${caseFile.opposingParty || "مشخص نشده"}
مرجع رسیدگی: ${caseFile.courtBranch || "مشخص نشده"}
مرحله رسیدگی: ${caseFile.stage || "جاری"}
وضعیت: ${caseFile.status === "open" ? "جاری" : caseFile.status === "in_review" ? "در دست بررسی" : "مختومه"}
موضوع خواسته/اتهام: ${caseFile.subject || ""}

=== شرح کامل وقایع و گردشکار پرونده ===
${caseFile.description || "شرحی ثبت نشده است."}

=== قراردادهای پیوست پرونده (${caseFile.contracts?.length || 0} مورد) ===
${
  caseFile.contracts && caseFile.contracts.length > 0
    ? caseFile.contracts
        .map(
          (c: any, i: number) =>
            `--- قرارداد ${i + 1}: ${c.title} (نوع: ${c.contractType || "نامشخص"} - تاریخ: ${c.date || "-"}) ---\nمتن کامل:\n${c.content}\n${c.notes ? `یادداشت: ${c.notes}\n` : ""}`
        )
        .join("\n")
    : "هیچ قراردادی ثبت نشده است."
}

=== اسناد، لوایح و مدارک پیوست پرونده (${caseFile.documents?.length || 0} مورد) ===
${
  caseFile.documents && caseFile.documents.length > 0
    ? caseFile.documents
        .map(
          (d: any, i: number) =>
            `--- سند ${i + 1}: ${d.title} (دسته: ${d.category} - تاریخ: ${d.date || "-"}) ---\nمتن سند:\n${d.content}\n${d.notes ? `یادداشت: ${d.notes}\n` : ""}`
        )
        .join("\n")
    : "هیچ سندی ثبت نشده است."
}
`;

    if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
      userPrompt += `\n=== سوابق گفت‌وگوهای اخیر پیرامون این پرونده ===\n`;
      chatHistory.slice(-5).forEach((msg: any) => {
        userPrompt += `${msg.sender === "user" ? "کاربر/وکیل" : "دادبان"}: ${msg.text}\n`;
      });
    }

    userPrompt += `\n=== پرسش یا خواسته جدید کاربر درباره این پرونده ===\n${message}`;

    const jsonText = await generateWithRetry({
      contents: userPrompt,
      systemInstruction: systemPrompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          keyInsights: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          suggestedActions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["reply", "keyInsights", "suggestedActions"],
      },
    });

    const data = JSON.parse(jsonText);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Case chat error:", error);
    res.status(500).json({
      error: "خطا در مشاوره هوشمند پرونده.",
      details: error.message,
    });
  }
});

// 4. Case & Document Summarization & Ambiguity Clarifier Endpoint
app.post("/api/case/summarize", async (req, res) => {
  try {
    const { caseText, documentType } = req.body;

    if (!caseText || caseText.trim().length < 30) {
      return res.status(400).json({
        error: "متن پرونده یا دادنامه برای خلاصه‌سازی الزامی است (حداقل ۳۰ کاراکتر).",
      });
    }

    const systemPrompt = `شما یک مستشار دادگاه تجدیدنظر و متخصص ارزیابی پرونده‌ها و اسناد قضایی هستید.
وظیفه شما تحلیل متن دادنامه، رای دادگاه، شکواییه، دادخواست، لایحه، قرارداد، صلح‌نامه یا گزارش پرونده است.
کاربر باید در کمترین زمان ممکن متوجه شود ماجرا چیست، چه رایی صادر شده یا خواسته چیست، نقاط قوت و ضعف چیست، چه عبارات مبهم و ثقیلی در متن وجود دارد، سرانجام و عواقب بعدی این سند چیست و چه اقدام بعدی باید انجام دهد.

بخش فوق‌العاده مهم «نتیجه نهایی و پیش‌بینی آثار و رویدادهای پس از این سند» (futureConsequences):
شما باید با هوش حقوقی عمیق تحلیل کنید که:
۱. نتیجه نهایی سند و اثر حقوقی آن (finalOutcomeSummary).
۲. پس از این سند کلاً چه اتفاقاتی حتماً می‌افتد و روال قانونی به کجا می‌رسد (inevitableConsequences).
۳. چه اتفاقات بد، تهدیدات ناخواسته یا خطرات فاجعه‌باری ممکن است به هر دلیل رخ دهد (به دلیل فقدان بندهای حفاظتی، ابهام یا سکوت متن، سوءنیت طرف مقابل، یا قصد کلی و ماهیت سند) (worstCaseScenarios).
۴. اقدامات بازدارنده و راه‌های مهار این خطرات (preventiveSafeguards).

قانون تخطی‌ناپذیر زبان: کلیه بخش‌های تحلیل، خلاصه، اصطلاحات، نقاط قوت و ضعف، پیش‌بینی آینده و پیشنهادات باید ۱۰۰٪ به زبان فارسی رسمی و حقوقی باشد و تحت هیچ شرایطی از عبارات انگلیسی استفاده نشود.

پاسخ را در قالب JSON با فیلدهای زیر برگردانید:
- caseTitle: عنوان خلاصه پرونده (مثلاً: دعوای مطالبه وجه سفته و خسارت تاخیر)
- plainLanguageSummary: خلاصه ماجرا به زبان بسیار ساده و روان برای موکل
- partiesAndClaims: شرح خواهان/شاکی و خوانده/مشتکی‌عنه و موضوع دقیق ادعا
- keyEventsTimeline: آرایه‌ای از رویدادها یا مواعد کلیدی مندرج در پرونده
- ambiguousPointsAndJargon: آرایه‌ای از اصطلاحات پیچیده فقهی/حقوقی در متن به همراه شرح ساده (مثلاً { term: "اصالت‌الظهور", simpleMeaning: "معنی ساده آن" })
- legalStrengths: نقاط قوت پرونده به نفع کاربر
- legalVulnerabilities: نقاط ضعف، خطرات یا مواعد در حال انقضا (مثل مهلت ۲۰ روزه تجدیدنظرخواهی)
- futureConsequences: شیء شامل (finalOutcomeSummary، inevitableConsequences، worstCaseScenarios، preventiveSafeguards)
- recommendedNextSteps: پیشنهادات استراتژیک برای لایحه دفاعیه یا اقدام بعدی وکیل`;

    const userPrompt = `نوع سند: ${documentType || "پرونده / دادنامه / لایحه"}
متن سند/پرونده:
${caseText}`;

    const jsonText = await generateWithRetry({
      contents: userPrompt,
      systemInstruction: systemPrompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          caseTitle: { type: Type.STRING },
          plainLanguageSummary: { type: Type.STRING },
          partiesAndClaims: { type: Type.STRING },
          keyEventsTimeline: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          ambiguousPointsAndJargon: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                simpleMeaning: { type: Type.STRING },
              },
              required: ["term", "simpleMeaning"],
            },
          },
          legalStrengths: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          legalVulnerabilities: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          futureConsequences: {
            type: Type.OBJECT,
            properties: {
              finalOutcomeSummary: { type: Type.STRING },
              inevitableConsequences: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              worstCaseScenarios: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              preventiveSafeguards: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              "finalOutcomeSummary",
              "inevitableConsequences",
              "worstCaseScenarios",
              "preventiveSafeguards",
            ],
          },
          recommendedNextSteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          "caseTitle",
          "plainLanguageSummary",
          "partiesAndClaims",
          "keyEventsTimeline",
          "ambiguousPointsAndJargon",
          "legalStrengths",
          "legalVulnerabilities",
          "futureConsequences",
          "recommendedNextSteps",
        ],
      },
    });

    const data = JSON.parse(jsonText);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Case summarization error:", error);
    res.status(500).json({
      error: "خطا در خلاصه‌سازی و ابهام‌زدایی پرونده.",
      details: error.message,
    });
  }
});

// PDF / Document to Persian Text Extraction
app.post("/api/pdf/extract", async (req, res) => {
  try {
    const { fileBase64, mimeType, fileName } = req.body;

    if (!fileBase64) {
      return res.status(400).json({ error: "فایل سندی ارسال نشده است." });
    }

    // Strip any data URL prefix (e.g. data:application/pdf;base64,)
    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
    const effectiveMimeType = mimeType || "application/pdf";

    const systemPrompt = `شما یک سامانه فوق‌پیشرفته و هوشمند برای استخراج متن، OCR چندزبانه و بازخوانی اسناد حقوقی و رسمی فارسی از فایل‌های PDF، تصاویر و اسکن‌ها هستید.
شما به صورت کاملاً تخصصی چالش‌های تاریخی اسناد و فونت‌های فارسی در PDF را برطرف می‌کنید:
۱. حروف جدا از هم و شکستگی کلمات (Disjointed Glyphs): اگر در سند یا PDF به دلیل مشکلات قلم و کدگذاری، حروفی مانند «ق ر ا ر د ا د» یا «د ا د گ ا ه» جدا از هم قرار دارند، آن‌ها را به شکل کاملاً پیوسته و صحیح طبق دستور خط رسمی فرهنگستان پیوند دهید («قرارداد»، «دادگاه»).
۲. وارونگی متن و ترتیب خواندن (Bidi Reversal): ترتیب خواندن کلمات باید دقیقاً راست‌به‌چپ (RTL) و مطابق جریان منطقی جملات باشد و هیچ کلمه‌ای معکوس نشود.
۳. اصلاح حروف عربی به فارسی و نیم‌فاصله‌ها:
   - تبدیل تمام کاف‌های عربی (ك) به کاف فارسی (ک)
   - تبدیل تمام یای عربی (ي) به یای فارسی (ی)
   - رعایت دقیق نیم‌فاصله‌ها (مثلاً «می‌باشد»، «خواسته‌های»، «قراردادها»، «شعبه‌های»)
   - حفظ ارقام فارسی یا تبدیل طبق رسم‌الخط سند
۴. استخراج ساختاریافته حقوقی:
   - تفکیک عناوین و سرفصل‌ها (مانند مواد ۱ و ۲ قرارداد، گردشکار، رای دادگاه، مقدمه، نظریه کارشناسی)
   - استخراج اشخاص و طرفین، مبالغ ریالی/تومانی، تاریخ‌های شمسی، شماره‌های ثبت/کلاسه
   - خواندن مهرها، تمبرها، حاشیه‌نویسی‌ها و پاراف‌های رسمی
۵. متن تمیز یکپارچه (fullCleanText): متنی شسته‌رفته، آراسته و بدون غلط‌های رایج OCR، آماده کپی در نرم‌افزارهای واژه‌پرداز یا ارسال به سامانه‌های دادگاه.
۶. بدون تحریف یا جاانداختن متن (High Fidelity): تمام بخش‌های قابل خواندن را با دقت ۱۰۰٪ منتقل کن.`;

    const userPrompt = `لطفاً این سند حقوقی/رسمی (${fileName || "سند PDF"}) را تحلیل و با دقت کامل متون فارسی آن را بازخوانی، تصحیح و استخراج ساختاریافته نما.
تمام مشکلات حروف تک‌تک، فونت‌های ناسازگار، حروف عربی و به هم ریختگی ترتیب کلمات را طبق خط معیار فارسی تصحیح کن.`;

    const contents = [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: effectiveMimeType,
              data: cleanBase64,
            },
          },
          {
            text: userPrompt,
          },
        ],
      },
    ];

    const jsonText = await generateWithRetry({
      contents,
      systemInstruction: systemPrompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          documentTitle: { type: Type.STRING },
          documentCategory: { type: Type.STRING },
          fullCleanText: { type: Type.STRING },
          wordCount: { type: Type.INTEGER },
          estimatedPages: { type: Type.INTEGER },
          detectedFontsAndEncoding: { type: Type.STRING },
          confidenceScore: { type: Type.INTEGER },
          articlesOrSections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                heading: { type: Type.STRING },
                text: { type: Type.STRING },
              },
              required: ["heading", "text"],
            },
          },
          extractedMetadata: {
            type: Type.OBJECT,
            properties: {
              dates: { type: Type.ARRAY, items: { type: Type.STRING } },
              monetaryAmounts: { type: Type.ARRAY, items: { type: Type.STRING } },
              partiesMentioned: { type: Type.ARRAY, items: { type: Type.STRING } },
              courtOrOfficeBranch: { type: Type.STRING },
              caseOrRegistrationNumber: { type: Type.STRING },
            },
            required: ["dates", "monetaryAmounts", "partiesMentioned"],
          },
          handwritingOrStampNotes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          extractionQualityNotes: { type: Type.STRING },
        },
        required: [
          "documentTitle",
          "documentCategory",
          "fullCleanText",
          "wordCount",
          "estimatedPages",
          "detectedFontsAndEncoding",
          "confidenceScore",
          "articlesOrSections",
          "extractedMetadata",
          "handwritingOrStampNotes",
          "extractionQualityNotes",
        ],
      },
    });

    const data = JSON.parse(jsonText);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("PDF extraction error:", error);
    res.status(500).json({
      error: "خطا در استخراج و بازخوانی متن سند PDF.",
      details: error.message,
    });
  }
});

// Persian Text Reconstruction, Beautifier & Normalizer (Fix PDF glitches + structure contracts cleanly)
app.post("/api/pdf/repair-persian-text", async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: "متن جهت بازسازی ارسال نشده است." });
    }

    const systemPrompt = `شما کارشناس ارشد ویراستاری، زبان‌شناسی حقوقی و ساختاردهی اسناد و قراردادهای رسمی در ایران هستید.
وظیفه شما بازسازی، اصلاح و قالب‌بندی متونی است که از فایل‌های PDF، اسکن‌ها یا رشته‌های متنی پیوسته (Run-on text) استخراج شده‌اند.

اهداف اصلی بازسازی:
۱. رفع عیوب نگارشی و فنی PDF:
   - بازسازی حروف گسسته و شکستگی کلمات (مثلاً «ق ر ا ر د ا د» -> «قرارداد»)
   - اصلاح کلمات و جملات وارونه یا به هم ریخته
   - تبدیل حروف عربی (ك، ي) به خط فارسی (ک، ی) و اعمال نیم‌فاصله‌های استاندارد

۲. ساختاربندی و آراستگی خط‌به‌خط سندی (Document & Contract Formatting):
   - اگر متن یک قرارداد یا سند حقوقی به صورت رشته‌ای، روزنامه‌وار یا با جداکننده‌هایی مانند (| یا ؛) پشت سر هم قرار دارد، آن را به یک ساختار استاندارد، خوانا، آراسته و زیبا با فاصله‌گذاری دقیق (Spacing & Alignment) تبدیل کنید؛ به گونه‌ای که کاربر با یک کپی‌پیست ساده در نرم‌افزار Word بتواند مستقیماً از آن پرینت بگیرد.
   - عنوان اصلی سند در خط اول با فاصله کافی
   - تاریخ انعقاد و مشخصات طرفین (کارفرما، پیمانکار، خریدار و...) در سطرهای مجزا و تفکیک‌شده
   - هر ماده به عنوان یک بند مجزا با تیتر شفاف (مانند: ماده ۱ – موضوع قرارداد، ماده ۲ – مدت قرارداد و...)
   - بندها و شروط فرعی به صورت خطوط زیرمجموعه با خط فاصله یا بالت
   - در انتهای قراردادها، بلوک رسمی امضا را اضافه نمایید (امضای طرفین:\nکارفرما: _______________\nپیمانکار: _______________)
   - هیچ تغییری در ارقام، شروط ماهوی، مبالغ یا اسامی ایجاد نکنید و صرفاً متن را آراسته و پیراسته نمایید.`;

    const userPrompt = `متن ورودی زیر را بازسازی، ویرایش و به قالب سندی و خط‌به‌خط استاندارد تبدیل نما:
${rawText}`;

    const jsonText = await generateWithRetry({
      contents: userPrompt,
      systemInstruction: systemPrompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          repairedText: { type: Type.STRING },
          changesSummary: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          detectedIssues: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["repairedText", "changesSummary", "detectedIssues"],
      },
    });

    const data = JSON.parse(jsonText);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Persian text repair error:", error);
    res.status(500).json({
      error: "خطا در بازسازی و استانداردسازی متن فارسی.",
      details: error.message,
    });
  }
});

// 6. Comprehensive Document Inspection & Verification (بررسی، اعتبارسنجی و ممیزی سند)
app.post("/api/document/inspect", async (req, res) => {
  try {
    const { documentText, fileBase64, mimeType, fileName, inspectionFocus } = req.body;

    if (!documentText && !fileBase64) {
      return res.status(400).json({
        error: "لطفاً متن سند یا فایل تصویر/PDF آن را جهت بررسی ارسال فرمایید.",
      });
    }

    const systemPrompt = `[نقش و شخصيت]
شما یک مستشار، کارشناس رسمی دادگستری در امور اصالت اسناد و خط‌شناسی و مشاور ارشد حقوقی مسلط بر تمامی ابعاد حقوقی، قضایی و ثبتی قوانین جمهوری اسلامی ایران هستید.

وظیفه شما: «بررسی، کارشناسی اصالت، ممیزی شکلی و اعتبارسنجی اسناد و مدارک حقوقی» (Document Inspection & Verification).
شما هرگونه سند (اعم از قرارداد، مبایعه‌نامه، صلح‌نامه، اقرارنامه، دادنامه، لایحه، رسید، فیش بانکی، چک، سفته، وکالت‌نامه یا اسناد دست‌نویس و چاپی) را از جهات زیر با دقت موشکافانه ممیزی می‌کنید:

۱. اصالت ظاهری و ارکان شکلی (Formal & Authenticity Audit):
   - وجود مشخصات هویتی و ثبتی کامل طرفین
   - صحت تاریخ‌ها و توالی زمانی رویدادها
   - بررسی وضعیت امضاها، اثر انگشت، مهرها، تمبر و گواهی امضا
   - شناسایی خط‌خوردگی، الحاق، پاراف‌های فاقد توضیح یا الحاقات مشکوک

۲. صحت ماهوی و تطبیق با قوانین آمره (Substantive & Statutory Legality):
   - تطبیق با ماده ۱۹۰ قانون مدنی (قصد و رضای طرفین، اهلیت، موضوع معین، مشروعیت جهت)
   - شناسایی شروط باطل و مبطل (مواد ۲۳۲ و ۲۳۳ ق.م)
   - اسقاط‌های خطرناک خیارات و عدم توازن تعهدات
   - اعتبارسنجی قابلیت استناد در محاکم دادگستری و شورای حل اختلاف

۳. نمره و ارزیابی نهایی (Verdicts):
   - امتیاز اصالت و ساختار (authenticityAndFormatScore بین ۰ تا ۱۰۰)
   - وضعیت کلی (overallVerdict): "valid" (معتبر و استاندارد) | "suspicious" (مشکوک یا دارای ابهام) | "defective" (دارای نقص شکلی یا نقض ماده قانونی) | "high_risk" (پرخطر با احتمال بطلان یا کلاهبرداری)
   - خلاصه رای کارشناسی (verdictSummary)
   - ایرادات شکلی (formalDefects)
   - خطرات ماهوی (substantiveRisks)
   - بررسی امضا و مهرها (stampsAndSignaturesAudit)
   - تطبیق مواد قانونی (statutoryComplianceNotes)
   - توصیه‌ها و اقدامات اصلاحی لازم (actionableRecommendations)

قانون اکید زبان: تمام خروجی‌ها باید منحصراً و ۱۰۰٪ به زبان فارسی رسمی و فصیح حقوقی باشد.`;

    const inspectionSchema = {
      type: Type.OBJECT,
      properties: {
        documentTitle: { type: Type.STRING },
        documentCategory: { type: Type.STRING },
        authenticityAndFormatScore: { type: Type.INTEGER },
        overallVerdict: { type: Type.STRING },
        verdictSummary: { type: Type.STRING },
        extractedParties: { type: Type.ARRAY, items: { type: Type.STRING } },
        extractedDates: { type: Type.ARRAY, items: { type: Type.STRING } },
        extractedAmounts: { type: Type.ARRAY, items: { type: Type.STRING } },
        formalDefects: { type: Type.ARRAY, items: { type: Type.STRING } },
        substantiveRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
        stampsAndSignaturesAudit: { type: Type.ARRAY, items: { type: Type.STRING } },
        statutoryComplianceNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
        actionableRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: [
        "documentTitle",
        "documentCategory",
        "authenticityAndFormatScore",
        "overallVerdict",
        "verdictSummary",
        "extractedParties",
        "extractedDates",
        "extractedAmounts",
        "formalDefects",
        "substantiveRisks",
        "stampsAndSignaturesAudit",
        "statutoryComplianceNotes",
        "actionableRecommendations",
      ],
    };

    let contents: any;

    if (fileBase64) {
      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
      const effectiveMimeType = mimeType || "image/jpeg";
      const userPrompt = `لطفاً این سند ارسالی (${fileName || "سند تصویری/PDF"}) را به صورت کارشناسی دقیق بررسی و اعتبارسنجی حقوقی نما.
${inspectionFocus ? `محورهای ویژه مدنظر کاربر: ${inspectionFocus}\n` : ""}
${documentText ? `متن تکمیلی/توضیحات:\n${documentText}` : ""}`;

      contents = [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: effectiveMimeType,
                data: cleanBase64,
              },
            },
            { text: userPrompt },
          ],
        },
      ];
    } else {
      const userPrompt = `لطفاً متن سند حقوقی زیر را با دقت کارشناسی بررسی، ممیزی شکلی، اعتبارسنجی و ممیزی قانونی نما:
${inspectionFocus ? `محورهای ویژه مدنظر کاربر: ${inspectionFocus}\n` : ""}
متن سند:
${documentText}`;
      contents = userPrompt;
    }

    const jsonText = await generateWithRetry({
      contents,
      systemInstruction: systemPrompt,
      responseSchema: inspectionSchema,
    });

    const data = JSON.parse(jsonText);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Document inspection error:", error);
    res.status(500).json({
      error: "خطا در بررسی و کارشناسی سند.",
      details: error.message,
    });
  }
});

// Serve public assets explicitly
app.use(express.static(path.join(process.cwd(), "public")));

// Vite Middleware integration
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const indexPath = path.join(distPath, "index.html");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.json({
          status: "ok",
          message: "Dadban AI Backend API service is running.",
          health: "/api/health"
        });
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Dadban AI Legal Assistant running on http://0.0.0.0:${PORT}`);
  });
}

start();
