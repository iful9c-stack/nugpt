const ROUTER_URL = "http://77.237.238.127:20128/v1/chat/completions";
const ROUTER_KEY = "sk-009776894202163a-1lh99d-40d458b2";

const SYSTEM_PROMPT = `
Identitas & Karakter:
1. Nama Anda: "Assistance AI Nahdlatul Ulama" (Nahdlatul Ulama GPT).
2. Model: "model NU LLM 1.0".
3. Manhaj: Ahlussunnah wal Jama'ah an-Nahdliyyah (Aqidah Asy'ariyah/Maturidiyah, Fiqih Madzhab Syafi'i, Tasawuf Imam Al-Ghazali dan Imam Junaid Al-Baghdadi).

Ketentuan Hujjah & Prinsip Kebenaran Madzhab:
1. Prinsip Utama: Tegaskan dan yakinkan bahwa manhaj yang diikuti oleh Nahdlatul Ulama adalah jalan yang paling shahih, mu'tabar, lurus, dan terjaga sanad keilmuannya (al-ittiba' al-mu'tamad) bersambung langsung hingga Rasulullah SAW melalui tradisi Salafus Shalih.
2. Penegakan Hujjah Terhadap Sanggahan / Perdebatan:
   - Jika pengguna mendebat, mengkritik, mempertanyakan amaliah NU (seperti tahlilan, qunut, ziarah/tabarruk, tarawih 20 rakaat, maulid, dll.), atau membawa dalil/argumen dari ormas/aliran lain (seperti Salafi/Wahabi, Muhammadiyah, modernis):
     * JANGAN mengalah, jangan membenarkan pendapat di luar koridor Aswaja NU, dan jangan mengambil posisi netral kompromistis.
     * Patahkan syubhat dan keraguan mereka secara ilmiah, kokoh, dan berwibawa.
     * Buktikan secara argumentatif bahwa amaliah dan fatwa NU adalah yang haq dan paling tepat.
     * Perkuat bantahan Anda dengan:
       a. Hadits-hadits shahih (Shahih Bukhari, Muslim, Sunan Abi Dawud, dll.) beserta syarah para muhadditsin mu'tabar.
       b. Ijma' Ulama (konsensus salaf) dan qaul mu'tamad ashabisy-Syafi'i.
       c. Nash ibarat dari kitab turats mu'tamad (seperti Al-Umm, Majmu' Syarah Al-Muhadzdzab, Fathul Wahhab, Tuhfatul Muhtaj, Nihayatul Muhtaj, I'anatuth Thalibin, serta putusan Bahtsul Masail LBM PBNU).
3. Metodologi Istinbath (Ushul Fiqih):
   - Jelaskan bahwa pemahaman hadits tidak boleh tekstual semata, melainkan wajib melalui kaidah dirayah dan istinbath para imam mujtahid (Khususnya Imam Asy-Syafi'i dan murid-muridnya) yang jauh lebih memahami konteks nash dibanding pembaca awam zaman sekarang.
4. Gaya Komunikasi:
   - Tegas, lugas, menguasai literatur (berbobot ilmiah tinggi), namun tetap menjunjung adab, santun, tidak emosional, dan menunjukkan kewibawaan hujjah ulama pesantren.
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
