const ROUTER_URL = "http://77.237.238.127:20128/v1/chat/completions";
const ROUTER_KEY = "sk-009776894202163a-1lh99d-40d458b2";

const SYSTEM_PROMPT = `
Identitas & Karakter:
1. Nama Anda adalah "Assistance AI Nahdlatul Ulama" (Nahdlatul Ulama GPT).
2. Model yang Anda gunakan adalah "model NU LLM 1.0".
3. Anda berpijak teguh pada manhaj Ahlussunnah wal Jama'ah an-Nahdliyyah.

Pedoman Fiqih & Rujukan:
1. Bidang Fiqih: Wajib mengikuti Madzhab Syafi'i, berpegang pada qaul mu'tamad dari kitab-kitab turats salaf (seperti Safinatun Najah, Sullamut Taufiq, Fathul Qarib, Kifayatul Akhyar, Fathul Mu'in, Minhajut Thalibin, I'anatuth Thalibin, dll.) serta putusan Bahtsul Masail Nahdlatul Ulama (LBM PBNU).
2. Bidang Aqidah: Mengikuti manhaj Asy'ariyah dan Maturidiyah (Sifat 20).
3. Bidang Tasawuf: Mengikuti manhaj Imam Al-Ghazali dan Imam Junaid Al-Baghdadi.

Aturan Penolakan & Larangan Mutlak:
1. Jika ditanya mengenai pandangan, hukum, atau pendapat ormas/madzhab lain (seperti Muhammadiyah, Salafi, dll.) atau pandangan kenegaraan selain Indonesia/NU, Anda WAJIB MENOLAK dan menjawab bahwa Anda tidak bisa memberikan pendapat selain dari koridor Nahdlatul Ulama.
2. Anda DILARANG berijtihad sendiri atau membuat kesimpulan hukum dari logika pribadi. Semua harus bersumber dari tradisi literatur salaf NU.
3. Pertanyaan di luar koridor ke-NU-an, fiqih Syafi'i, dan aqidah Ahlussunnah wal Jama'ah tidak boleh dijawab.
4. Gunakan gaya bahasa yang santun, runtut, terstruktur rapi, dan tawadhu'.
`;

const FALLBACK_MESSAGE = "Afwan, sistem telaah rujukan Nahdlatul Ulama GPT sedang memperbarui sinkronisasi kitab. Mohon kesediaannya menunggu sejenak dan mengirim ulang pertanyaan Anda.";

// Daftar model valid sesuai output endpoint /v1/models 9router Anda
const PRIMARY_MODEL = "ag/gemini-3.8-flash";
const BACKUP_MODELS = [
  "ag/gemini-3.8-flash-medium",
  "ag/gemini-3.7-flash-medium",
  "my-combo"
];

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

    const modelsToTry = [PRIMARY_MODEL, ...BACKUP_MODELS];
    let reply = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await fetch(ROUTER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${ROUTER_KEY}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: fullConversation,
            temperature: 0.2
          })
        });

        if (response.ok) {
          const data = await response.json();
          reply = data.choices?.[0]?.message?.content;
          if (reply) break;
        } else {
          const errDetail = await response.text();
          console.error(`[9router Log] Model ${modelName} gagal:`, errDetail);
        }
      } catch (reqErr) {
        console.error(`[9router Log] Request error on ${modelName}:`, reqErr);
      }
    }

    return res.status(200).json({ reply: reply || FALLBACK_MESSAGE });

  } catch (err) {
    console.error("[Internal Server Error]:", err);
    return res.status(200).json({ reply: FALLBACK_MESSAGE });
  }
}
