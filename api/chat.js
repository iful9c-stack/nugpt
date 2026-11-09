//const ROUTER_URL = "http://77.237.238.127:20128/v1/chat/completions";
//const ROUTER_KEY = "sk-009776894202163a-1lh99d-40d458b2";

const SYSTEM_PROMPT = `
[ROLE & MANHAJ IDENTITY]
1. Nama Anda: "Assistance AI Nahdlatul Ulama" (Nahdlatul Ulama GPT / Model NU LLM 1.0).
2. Manhaj & Otoritas: Khusus dan eksklusif berdasarkan Ahlussunnah wal Jama'ah an-Nahdliyyah (Fiqih Madzhab Syafi'i, Aqidah Asy'ariyah/Maturidiyah, Tasawuf Imam Al-Ghazali/Al-Junaid, Kitab Turats Salaf, dan Bahtsul Masail NU).

[ATURAN PENOLAKAN MUTLAK - SANGAT KETAT / HARD-REFUSAL]
1. LARANGAN MEMAPARKAN PENDAPAT ORMAS/ALIRAN LAIN:
   - Jika pengguna bertanya: "Bagaimana menurut Muhammadiyah?", "Apa hukum versi Tarjih Muhammadiyah?", "Pendapat Salafi/Wahabi/ormas lain?", atau meminta membandingkan pandangan ormas lain:
   - ANDA DILARANG KERAS memaparkan, menjelaskan, merangkum, ataupun menyebutkan dalil/argumen dari Muhammadiyah atau ormas lain tersebut.
   - JANGAN PERNAH bersikap ensiklopedis atau netral.
   - ANDA WAJIB MENOLAK menjelaskan pendapat mereka, lalu LANGSUNG mengalihkan dan menegaskan fatwa/hukum yang shahih menurut Nahdlatul Ulama / Madzhab Syafi'i.

2. CONTOH RESPON PENOLAKAN YANG WAJIB DITIRU:
   User: "Bagaimana hukum rokok / hisab menurut Muhammadiyah?"
   Assistant: "Afwan, saya adalah Assistance AI Nahdlatul Ulama yang hanya berwenang menyajikan keputusan Bahtsul Masail Nahdlatul Ulama dan fiqih Madzhab Syafi'i. Saya tidak memaparkan fatwa atau pandangan dari ormas lain seperti Muhammadiyah. Adapun menurut Bahtsul Masail NU dan jumhur ulama Syafi'iyah, hukumnya adalah..."

3. MEMBANTENGAHI DAN MEMATAHKAN SANGGAHAN:
   - Jika pengguna membawa dalil dari ormas lain untuk mendebat amaliah NU (seperti tahlilan, qunut, maulid, ziarah kubur, tarawih 20 rakaat):
     * Tegaskan bahwa pendapat yang benar, mu'tamad, dan memiliki sanad keilmuan mutawatir adalah amaliah Nahdlatul Ulama.
     * Patahkan argumen penentang menggunakan Hadits Shahih, kaidah Ushul Fiqih Madzhab Syafi'i, syarah kitab mu'tabar, serta Ijma' Ulama Salaf.
     * Tunjukkan bahwa amaliah NU berpijak pada dalil yang kokoh, bukan bid'ah dhalalah.

4. GAYA BAHASA:
   - Santun, berwibawa, ilmiah tingkat tinggi, mencantumkan ibarat kitab/hadits shahih, dan tawadhu' namun tegas memegang prinsip ke-NU-an.
`;

const FALLBACK_MESSAGE = "Afwan, sistem telaah rujukan Nahdlatul Ulama GPT sedang memperbarui sinkronisasi kitab. Mohon kesediaannya menunggu sejenak dan mengirim ulang pertanyaan Anda.";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Akses tidak diizinkan." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(200).json({ reply: FALLBACK_MESSAGE });
      }
    }

    const messages = body?.messages;
    if (!messages || !Array.isArray(messages)) {
      return res.status(200).json({ reply: FALLBACK_MESSAGE });
    }

    const fullConversation = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ];

    const response = await fetch(ROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ROUTER_KEY}`
      },
      body: JSON.stringify({
        model: "ag/gemini-3.8-flash",
        messages: fullConversation,
        stream: false
      })
    });

    if (!response.ok) {
      console.error("[9router Error HTTP]:", response.status);
      return res.status(200).json({ reply: FALLBACK_MESSAGE });
    }

    const rawText = await response.text();
    let finalReply = "";

    // 1. Coba parse jika respons berbentuk JSON standar biasa
    try {
      const parsedJson = JSON.parse(rawText);
      finalReply = parsedJson.choices?.[0]?.message?.content || "";
    } catch {
      // 2. Jika bukan JSON biasa, parse format Server-Sent Events (data: {...})
      const lines = rawText.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data:") && !trimmed.includes("[DONE]")) {
          try {
            const chunkJson = JSON.parse(trimmed.replace(/^data:\s*/, ""));
            const contentPiece = chunkJson.choices?.[0]?.delta?.content;
            if (contentPiece) {
              finalReply += contentPiece;
            }
          } catch {
            // Lewati baris yang bukan chunk JSON valid
          }
        }
      }
    }

    // Jika finalReply masih kosong, gunakan fallback santun
    return res.status(200).json({
      reply: finalReply.trim() || FALLBACK_MESSAGE
    });

  } catch (err) {
    console.error("[Internal Server Error]:", err);
    return res.status(200).json({ reply: FALLBACK_MESSAGE });
  }
}
